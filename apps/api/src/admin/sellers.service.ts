import { Injectable, NotFoundException, ConflictException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { SellerType, SellerStatus, UserRole } from "@repo/db";

export interface OnboardSellerDto {
  fullName: string;
  email: string;
  phone?: string;
  companyName: string;
  sellerType?: SellerType;
  tradeLicenseNumber?: string;
  tinBinNumber?: string;
  commissionRate?: number;
}

export interface UpdateSellerDto {
  companyName?: string;
  sellerType?: SellerType;
  tradeLicenseNumber?: string;
  tinBinNumber?: string;
  commissionRate?: number;
  complianceScore?: number;
  status?: SellerStatus;
}

@Injectable()
export class SellersService {
  constructor(private readonly prisma: PrismaService) {}

  async listSellers(filters?: { status?: SellerStatus; sellerType?: SellerType }) {
    const where: any = {};
    if (filters?.status) where.status = filters.status;
    if (filters?.sellerType) where.sellerType = filters.sellerType;

    const sellers = await this.prisma.sellerProfile.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        user: { select: { id: true, fullName: true, email: true, phone: true, isActive: true } },
        _count: { select: { payoutRequests: true } },
      },
    });

    return sellers.map((s) => ({
      id: s.id,
      userId: s.userId,
      fullName: s.user.fullName,
      email: s.user.email,
      phone: s.user.phone,
      companyName: s.companyName,
      sellerType: s.sellerType,
      tradeLicenseNumber: s.tradeLicenseNumber,
      tinBinNumber: s.tinBinNumber,
      commissionRate: Number(s.commissionRate),
      complianceScore: Number(s.complianceScore),
      status: s.status,
      payoutRequestsCount: s._count.payoutRequests,
      createdAt: s.createdAt,
    }));
  }

  async getSellerById(id: string) {
    const seller = await this.prisma.sellerProfile.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, fullName: true, email: true, phone: true, isActive: true } },
        payoutRequests: { orderBy: { createdAt: "desc" }, take: 10 },
      },
    });

    if (!seller) {
      throw new NotFoundException(`Seller with ID "${id}" not found`);
    }

    return seller;
  }

  async onboardSeller(dto: OnboardSellerDto) {
    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });

    if (existingUser) {
      throw new ConflictException(`User with email "${dto.email}" already exists`);
    }

    return this.prisma.$transaction(async (tx) => {
      const fullName = dto.fullName || (dto as any).contactName || "Seller Partner";
      const user = await tx.user.create({
        data: {
          email: dto.email.toLowerCase(),
          fullName,
          phone: dto.phone,
          passwordHash: "$argon2id$v=19$m=65536,t=3,p=4$tempPasswordHash123", // placeholder password
          role: UserRole.SELLER,
          isActive: true,
          isVerified: true,
        },
      });

      const profile = await tx.sellerProfile.create({
        data: {
          userId: user.id,
          companyName: dto.companyName,
          sellerType: dto.sellerType || SellerType.MERCHANT,
          tradeLicenseNumber: dto.tradeLicenseNumber,
          tinBinNumber: dto.tinBinNumber,
          commissionRate: dto.commissionRate || 5.0,
          complianceScore: 100.0,
          status: SellerStatus.APPROVED,
        },
      });

      return {
        id: profile.id,
        userId: user.id,
        fullName: user.fullName,
        email: user.email,
        phone: user.phone,
        companyName: profile.companyName,
        sellerType: profile.sellerType,
        tradeLicenseNumber: profile.tradeLicenseNumber,
        tinBinNumber: profile.tinBinNumber,
        commissionRate: Number(profile.commissionRate),
        complianceScore: Number(profile.complianceScore),
        status: profile.status,
        createdAt: profile.createdAt,
      };
    });
  }

  async updateSeller(id: string, dto: UpdateSellerDto) {
    const seller = await this.prisma.sellerProfile.findUnique({ where: { id } });
    if (!seller) {
      throw new NotFoundException(`Seller with ID "${id}" not found`);
    }

    return this.prisma.sellerProfile.update({
      where: { id },
      data: {
        ...(dto.companyName ? { companyName: dto.companyName } : {}),
        ...(dto.sellerType ? { sellerType: dto.sellerType } : {}),
        ...(dto.tradeLicenseNumber !== undefined ? { tradeLicenseNumber: dto.tradeLicenseNumber } : {}),
        ...(dto.tinBinNumber !== undefined ? { tinBinNumber: dto.tinBinNumber } : {}),
        ...(dto.commissionRate !== undefined ? { commissionRate: dto.commissionRate } : {}),
        ...(dto.complianceScore !== undefined ? { complianceScore: dto.complianceScore } : {}),
        ...(dto.status ? { status: dto.status } : {}),
      },
      include: {
        user: { select: { fullName: true, email: true } },
      },
    });
  }
}
