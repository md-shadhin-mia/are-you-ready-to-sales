import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { Supplier } from "@repo/db";
import { PrismaService } from "../prisma/prisma.service";
import { CreateSupplierDto, UpdateSupplierDto } from "./procurement.dto";

export const CONTRACT_WARNING_DAYS = 30;
const DAY_MS = 86_400_000;

export function isValidTin(tin: string): boolean {
  return /^\d{12}$/.test(tin);
}

export type ContractState = "ACTIVE" | "EXPIRING_SOON" | "EXPIRED" | "NO_CONTRACT";

export function classifyContract(endDate: Date | null, now = new Date()): { state: ContractState; daysRemaining: number | null } {
  if (!endDate) return { state: "NO_CONTRACT", daysRemaining: null };
  const daysRemaining = Math.floor((endDate.getTime() - now.getTime()) / DAY_MS);
  if (daysRemaining < 0) return { state: "EXPIRED", daysRemaining };
  if (daysRemaining <= CONTRACT_WARNING_DAYS) return { state: "EXPIRING_SOON", daysRemaining };
  return { state: "ACTIVE", daysRemaining };
}

@Injectable()
export class SuppliersService {
  constructor(private readonly prisma: PrismaService) {}

  private present(s: Supplier) {
    const contract = classifyContract(s.contractEndDate);
    return { ...s, contractState: contract.state, contractDaysRemaining: contract.daysRemaining };
  }

  async list(includeInactive = false) {
    const suppliers = await this.prisma.supplier.findMany({
      where: includeInactive ? {} : { isActive: true },
      orderBy: { name: "asc" },
    });
    return suppliers.map((s) => this.present(s));
  }

  async get(id: string) {
    const supplier = await this.prisma.supplier.findUnique({ where: { id } });
    if (!supplier) throw new NotFoundException(`Supplier "${id}" not found`);
    return this.present(supplier);
  }

  async create(dto: CreateSupplierDto) {
    if (await this.prisma.supplier.findUnique({ where: { tinNumber: dto.tinNumber } })) {
      throw new ConflictException(`A supplier with TIN ${dto.tinNumber} already exists`);
    }
    const supplier = await this.prisma.supplier.create({
      data: {
        ...dto,
        contractStartDate: dto.contractStartDate ? new Date(dto.contractStartDate) : undefined,
        contractEndDate: dto.contractEndDate ? new Date(dto.contractEndDate) : undefined,
      },
    });
    return this.present(supplier);
  }

  async update(id: string, dto: UpdateSupplierDto) {
    await this.get(id);
    const supplier = await this.prisma.supplier.update({
      where: { id },
      data: {
        ...dto,
        contractStartDate: dto.contractStartDate ? new Date(dto.contractStartDate) : undefined,
        contractEndDate: dto.contractEndDate ? new Date(dto.contractEndDate) : undefined,
      },
    });
    return this.present(supplier);
  }

  /** Active suppliers whose agreements lapse within 30 days (or already have). */
  async contractAlerts() {
    const horizon = new Date(Date.now() + CONTRACT_WARNING_DAYS * DAY_MS);
    const suppliers = await this.prisma.supplier.findMany({
      where: { isActive: true, contractEndDate: { lte: horizon } },
      orderBy: { contractEndDate: "asc" },
    });
    return suppliers.map((s) => this.present(s));
  }
}
