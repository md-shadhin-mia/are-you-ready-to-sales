import { describe, it, expect } from "vitest";
import { validate } from "class-validator";
import { CreateMasterProductDto } from "./dto/master-product.dto";

describe("CreateMasterProductDto validation", () => {
  it("should validate a valid DTO successfully", async () => {
    const dto = new CreateMasterProductDto();
    dto.sku = "SKU-VAL-001";
    dto.title = "Test Product";
    dto.categoryId = "cat-uuid-123";
    dto.basePrice = 1500;
    dto.stockQuantity = 20;
    dto.masterDescription = "High quality testing product";

    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  it("should reject negative base price", async () => {
    const dto = new CreateMasterProductDto();
    dto.sku = "SKU-VAL-002";
    dto.title = "Test Product";
    dto.categoryId = "cat-uuid-123";
    dto.basePrice = -50;
    dto.masterDescription = "Negative price product";

    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    const priceError = errors.find((e) => e.property === "basePrice");
    expect(priceError).toBeDefined();
  });

  it("should reject negative stock quantity", async () => {
    const dto = new CreateMasterProductDto();
    dto.sku = "SKU-VAL-003";
    dto.title = "Test Product";
    dto.categoryId = "cat-uuid-123";
    dto.basePrice = 500;
    dto.stockQuantity = -5;
    dto.masterDescription = "Negative stock product";

    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    const stockError = errors.find((e) => e.property === "stockQuantity");
    expect(stockError).toBeDefined();
  });
});
