import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  NotFoundException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { ConfigService } from "@nestjs/config";
import { PrismaService } from "../prisma/prisma.service";
import { RedisService } from "../redis/redis.service";
import { PasswordService } from "./password.service";
import { RegisterDto, LoginDto } from "./dto/auth.dto";
import { UserRole } from "@repo/db";
import { randomUUID } from "crypto";

@Injectable()
export class AuthService {
  private readonly accessSecret: string;
  private readonly refreshSecret: string;
  private readonly accessExpiresIn: string;
  private readonly refreshExpiresIn: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly passwordService: PasswordService,
  ) {
    const accessSecret = this.configService.get<string>("JWT_ACCESS_SECRET");
    const refreshSecret = this.configService.get<string>("JWT_REFRESH_SECRET");
    if (!accessSecret || !refreshSecret) {
      throw new Error(
        "JWT_ACCESS_SECRET and JWT_REFRESH_SECRET must be set (see .env.example)",
      );
    }
    this.accessSecret = accessSecret;
    this.refreshSecret = refreshSecret;
    this.accessExpiresIn =
      this.configService.get<string>("JWT_ACCESS_EXPIRES_IN") || "15m";
    this.refreshExpiresIn =
      this.configService.get<string>("JWT_REFRESH_EXPIRES_IN") || "7d";
  }

  async register(dto: RegisterDto) {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });

    if (existing) {
      throw new ConflictException("Email is already registered");
    }

    const passwordHash = await this.passwordService.hash(dto.password);

    const user = await this.prisma.user.create({
      data: {
        email: dto.email.toLowerCase(),
        fullName: dto.fullName,
        phone: dto.phone,
        passwordHash,
        role: UserRole.STUDENT,
        isActive: true,
        isVerified: true,
      },
      select: {
        id: true,
        email: true,
        fullName: true,
        phone: true,
        role: true,
        isActive: true,
        isVerified: true,
        createdAt: true,
      },
    });

    const tokens = await this.generateTokens(user.id, user.email, user.role);
    return { user, ...tokens };
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException("Invalid email or password");
    }

    const isValid = await this.passwordService.verify(
      user.passwordHash,
      dto.password,
    );

    if (!isValid) {
      throw new UnauthorizedException("Invalid email or password");
    }

    const tokens = await this.generateTokens(user.id, user.email, user.role);

    const { passwordHash: _, ...safeUser } = user;
    return { user: safeUser, ...tokens };
  }

  async refresh(refreshToken: string) {
    let payload: { sub: string; tokenId: string };
    try {
      payload = await this.jwtService.verifyAsync(refreshToken, {
        secret: this.refreshSecret,
      });
    } catch {
      throw new UnauthorizedException("Invalid or expired refresh token");
    }

    const tokenKey = `auth:refresh:${payload.sub}:${payload.tokenId}`;
    const stored = await this.redis.get(tokenKey);

    if (!stored) {
      throw new UnauthorizedException("Invalid or revoked refresh token");
    }

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException("User not found or inactive");
    }

    // Rotate: invalidate the used refresh token before issuing new ones.
    await this.redis.del(tokenKey);
    return this.generateTokens(user.id, user.email, user.role);
  }

  async logout(userId: string, refreshToken?: string) {
    if (refreshToken) {
      try {
        const payload = await this.jwtService.verifyAsync(refreshToken, {
          secret: this.refreshSecret,
        });
        await this.redis.del(`auth:refresh:${userId}:${payload.tokenId}`);
        return { success: true };
      } catch {
        // Fall through to revoking all sessions if the token can't be parsed.
      }
    }

    // No usable refresh token supplied: revoke every device's session.
    await this.redis.delByPrefix(`auth:refresh:${userId}:`);
    return { success: true };
  }

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        fullName: true,
        phone: true,
        role: true,
        isActive: true,
        isVerified: true,
        createdAt: true,
        stores: {
          select: {
            id: true,
            storeName: true,
            slug: true,
            status: true,
            logoUrl: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException("User not found");
    }

    return user;
  }

  private async generateTokens(userId: string, email: string, role: string) {
    const tokenId = randomUUID();

    const accessToken = await this.jwtService.signAsync(
      { sub: userId, email, role },
      {
        secret: this.accessSecret,
        expiresIn: this.accessExpiresIn,
      },
    );

    const refreshToken = await this.jwtService.signAsync(
      { sub: userId, tokenId },
      {
        secret: this.refreshSecret,
        expiresIn: this.refreshExpiresIn,
      },
    );

    // Save refresh tokenId in Redis for 7 days (604800s), keyed per-device
    // so logging in on a new device doesn't invalidate other sessions.
    await this.redis.set(
      `auth:refresh:${userId}:${tokenId}`,
      "1",
      7 * 24 * 3600,
    );

    return {
      accessToken,
      refreshToken,
      expiresIn: 900, // 15 minutes
    };
  }
}
