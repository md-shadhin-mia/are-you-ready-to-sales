import { describe, it, expect } from "vitest";
import { clampPagination, paginationMeta, MAX_PAGE_SIZE } from "./pagination";

describe("clampPagination (Unit)", () => {
  it("defaults to page 1 and 20 rows", () => {
    expect(clampPagination({})).toEqual({ page: 1, limit: 20, skip: 0 });
  });

  it("never allows more than 100 rows per page", () => {
    expect(MAX_PAGE_SIZE).toBe(100);
    expect(clampPagination({ page: 2, limit: 5000 })).toEqual({ page: 2, limit: 100, skip: 100 });
  });

  it("coerces invalid numbers and strings to safe bounds", () => {
    expect(clampPagination({ page: "-3", limit: "abc" })).toEqual({ page: 1, limit: 20, skip: 0 });
    expect(clampPagination({ page: "3", limit: "10" })).toEqual({ page: 3, limit: 10, skip: 20 });
  });

  it("calculates paginationMeta correctly including zero total", () => {
    expect(paginationMeta(1, 20, 50)).toEqual({ page: 1, limit: 20, total: 50, totalPages: 3 });
    expect(paginationMeta(1, 20, 0)).toEqual({ page: 1, limit: 20, total: 0, totalPages: 1 });
  });
});
