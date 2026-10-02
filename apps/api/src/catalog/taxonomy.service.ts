import { BadRequestException, ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { DocumentSequenceService } from "../common/document-sequence.service";
import {
  CreateBrandDto,
  CreateColorDto,
  CreateSizeDto,
  UpdateBrandDto,
  UpdateColorDto,
  UpdateSizeDto,
} from "./taxonomy.dto";

interface OptionRef {
  id: string;
  code: string;
}

export interface VariantPlan {
  sizeId: string | null;
  colorId: string | null;
  sku: string;
}

const token = (code: string) => code.toUpperCase().replace(/[^A-Z0-9]/g, "");
export const comboKey = (sizeId: string | null, colorId: string | null) => `${sizeId ?? ""}|${colorId ?? ""}`;

/**
 * Cartesian size x color matrix. SKUs are BASE-SIZE-COLOR; if a SKU is already taken (or two option
 * codes normalize to the same token) a numeric suffix is appended so every SKU stays unique.
 */
export function generateVariantMatrix(
  baseSku: string,
  sizes: OptionRef[],
  colors: OptionRef[],
  opts: { existingCombos?: Set<string>; takenSkus?: Set<string> } = {},
): VariantPlan[] {
  if (sizes.length === 0 && colors.length === 0) {
    throw new BadRequestException("Provide at least one size or color to generate variants");
  }
  const used = new Set(opts.takenSkus ?? []);
  const sizeAxis: Array<OptionRef | null> = sizes.length ? sizes : [null];
  const colorAxis: Array<OptionRef | null> = colors.length ? colors : [null];

  const plans: VariantPlan[] = [];
  for (const size of sizeAxis) {
    for (const color of colorAxis) {
      const key = comboKey(size?.id ?? null, color?.id ?? null);
      if (opts.existingCombos?.has(key)) continue;

      const base = [baseSku, size && token(size.code), color && token(color.code)].filter(Boolean).join("-");
      let sku = base;
      for (let n = 2; used.has(sku); n++) sku = `${base}-${n}`;
      used.add(sku);
      plans.push({ sizeId: size?.id ?? null, colorId: color?.id ?? null, sku });
    }
  }
  return plans;
}

export function ean13CheckDigit(first12: string): number {
  const sum = first12.split("").reduce((acc, d, i) => acc + Number(d) * (i % 2 === 0 ? 1 : 3), 0);
  return (10 - (sum % 10)) % 10;
}

@Injectable()
export class TaxonomyService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly sequences: DocumentSequenceService,
  ) {}

  // ----- Brands -----

  async listBrands() {
    const brands = await this.prisma.brand.findMany({
      orderBy: { name: "asc" },
      include: { _count: { select: { masterProducts: true } } },
    });
    return brands.map(({ _count, ...b }) => ({ ...b, productsCount: _count.masterProducts }));
  }

  async createBrand(dto: CreateBrandDto) {
    if (await this.prisma.brand.findUnique({ where: { slug: dto.slug } })) {
      throw new ConflictException(`Brand slug "${dto.slug}" already exists`);
    }
    return this.prisma.brand.create({ data: dto });
  }

  async updateBrand(id: string, dto: UpdateBrandDto) {
    await this.findOrFail(this.prisma.brand, id, "Brand");
    return this.prisma.brand.update({ where: { id }, data: dto });
  }

  async deleteBrand(id: string) {
    await this.findOrFail(this.prisma.brand, id, "Brand");
    const linked = await this.prisma.masterProduct.count({ where: { brandId: id } });
    if (linked > 0) {
      throw new ConflictException(`Brand has ${linked} linked product(s); deactivate it instead of deleting`);
    }
    await this.prisma.brand.delete({ where: { id } });
    return { id, deleted: true };
  }

  // ----- Sizes & colors -----

  listSizes() {
    return this.prisma.size.findMany({ orderBy: [{ sortOrder: "asc" }, { name: "asc" }] });
  }

  async createSize(dto: CreateSizeDto) {
    const code = dto.code.toUpperCase();
    if (await this.prisma.size.findUnique({ where: { code } })) throw new ConflictException(`Size ${code} exists`);
    return this.prisma.size.create({ data: { ...dto, code } });
  }

  async updateSize(id: string, dto: UpdateSizeDto) {
    await this.findOrFail(this.prisma.size, id, "Size");
    return this.prisma.size.update({ where: { id }, data: dto });
  }

  listColors() {
    return this.prisma.color.findMany({ orderBy: { name: "asc" } });
  }

  async createColor(dto: CreateColorDto) {
    const code = dto.code.toUpperCase();
    if (await this.prisma.color.findUnique({ where: { code } })) throw new ConflictException(`Color ${code} exists`);
    return this.prisma.color.create({ data: { ...dto, code, hexCode: dto.hexCode.toUpperCase() } });
  }

  async updateColor(id: string, dto: UpdateColorDto) {
    await this.findOrFail(this.prisma.color, id, "Color");
    return this.prisma.color.update({ where: { id }, data: { ...dto, hexCode: dto.hexCode?.toUpperCase() } });
  }

  // ----- Variants -----

  listVariants(masterProductId: string) {
    return this.prisma.productVariant.findMany({
      where: { masterProductId },
      include: { size: true, color: true },
      orderBy: [{ size: { sortOrder: "asc" } }, { sku: "asc" }],
    });
  }

  async generateVariants(masterProductId: string, sizeIds: string[], colorIds: string[]) {
    const product = await this.prisma.masterProduct.findUnique({ where: { id: masterProductId }, select: { sku: true } });
    if (!product) throw new NotFoundException("Master product not found");

    const [sizes, colors, existing] = await Promise.all([
      this.prisma.size.findMany({ where: { id: { in: sizeIds }, isActive: true }, orderBy: { sortOrder: "asc" } }),
      this.prisma.color.findMany({ where: { id: { in: colorIds }, isActive: true } }),
      this.prisma.productVariant.findMany({ where: { masterProductId }, select: { sizeId: true, colorId: true } }),
    ]);
    if (sizes.length !== new Set(sizeIds).size || colors.length !== new Set(colorIds).size) {
      throw new BadRequestException("One or more sizes/colors are unknown or inactive");
    }
    const orderedColors = colorIds.map((id) => colors.find((c) => c.id === id)!);

    const [takenVariants, takenProducts] = await Promise.all([
      this.prisma.productVariant.findMany({ where: { sku: { startsWith: product.sku } }, select: { sku: true } }),
      this.prisma.masterProduct.findMany({ where: { sku: { startsWith: product.sku } }, select: { sku: true } }),
    ]);

    const plans = generateVariantMatrix(product.sku, sizes, orderedColors, {
      existingCombos: new Set(existing.map((v) => comboKey(v.sizeId, v.colorId))),
      takenSkus: new Set([...takenVariants, ...takenProducts].map((v) => v.sku)),
    });

    if (plans.length > 0) {
      await this.prisma.$transaction(async (tx) => {
        const serials = await this.sequences.nextRange("BARCODE", plans.length, { tx, pad: 9 });
        await tx.productVariant.createMany({
          data: plans.map((plan, i) => {
            const [, year, serial] = serials[i].split("-");
            const first12 = `2${year.slice(-2)}${serial}`;
            return { masterProductId, ...plan, barcode: `${first12}${ean13CheckDigit(first12)}` };
          }),
        });
      });
    }

    const variants = await this.listVariants(masterProductId);
    const createdSkus = new Set(plans.map((p) => p.sku));
    return { created: plans.length, variants: variants.filter((v) => createdSkus.has(v.sku)) };
  }

  private async findOrFail(delegate: { findUnique(args: any): Promise<unknown> }, id: string, label: string) {
    const row = await delegate.findUnique({ where: { id } });
    if (!row) throw new NotFoundException(`${label} "${id}" not found`);
    return row;
  }
}
