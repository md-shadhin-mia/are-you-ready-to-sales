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
    this.accessSecret =
      this.configService.get<string>("JWT_ACCESS_SECRET") ||
      "dev-access-super-secret-key-at-least-32-chars-long";
    this.refreshSecret =
      this.configService.get<string>("JWT_REFRESH_SECRET") ||
      "dev-refresh-super-secret-key-at-least-32-chars-long";
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
    try {
      const payload = await this.jwtService.verifyAsync(refreshToken, {
        secret: this.refreshSecret,
      });

      const storedTokenId = await this.redis.get(
        `auth:refresh:${payload.sub}`,
      );

      if (!storedTokenId || storedTokenId !== payload.tokenId) {
        throw new UnauthorizedException("Invalid or revoked refresh token");
      }

      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
      });

      if (!user || !user.isActive) {
        throw new UnauthorizedException("User not found or inactive");
      }

      return this.generateTokens(user.id, user.email, user.role);
    } catch {
      throw new UnauthorizedException("Invalid or expired refresh token");
    }
  }

  async logout(userId: string) {
    await this.redis.del(`auth:refresh:${userId}`);
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

    // Save refresh tokenId in Redis for 7 days (604800s)
    await this.redis.set(`auth:refresh:${userId}`, tokenId, 7 * 24 * 3600);

    return {
      accessToken,
      refreshToken,
      expiresIn: 900, // 15 minutes
    };
  }
}
