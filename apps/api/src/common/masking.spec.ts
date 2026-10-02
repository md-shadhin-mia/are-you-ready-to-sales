import { describe, it, expect } from "vitest";
import { maskNationalId, maskPhone } from "./masking";

describe("PII masking (Unit)", () => {
  it("redacts NID to the last 4 digits", () => {
    expect(maskNationalId("1990123456789")).toBe("*********6789");
  });

  it("handles missing and very short NIDs", () => {
    expect(maskNationalId(null)).toBeNull();
    expect(maskNationalId("123")).toBe("***");
  });

  it("masks the middle of phone numbers", () => {
    expect(maskPhone("+8801711223344")).toBe("+8801******344");
    expect(maskPhone("1234567")).toBe("****567");
    expect(maskPhone(undefined)).toBeNull();
  });
});
