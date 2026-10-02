import { describe, it, expect, beforeEach } from "vitest";
import { PasswordService } from "./password.service";

describe("PasswordService (Argon2)", () => {
  let passwordService: PasswordService;

  beforeEach(() => {
    passwordService = new PasswordService();
  });

  it("should hash a password and produce a valid argon2 hash", async () => {
    const plain = "SecureP@ssword123!";
    const hash = await passwordService.hash(plain);

    expect(hash).toBeDefined();
    expect(hash.startsWith("$argon2id$")).toBe(true);
  });

  it("should return true when verifying the correct password", async () => {
    const plain = "CorrectHorseBatteryStaple";
    const hash = await passwordService.hash(plain);

    const isValid = await passwordService.verify(hash, plain);
    expect(isValid).toBe(true);
  });

  it("should return false when verifying an incorrect password", async () => {
    const plain = "MySecret123";
    const hash = await passwordService.hash(plain);

    const isValid = await passwordService.verify(hash, "WrongPassword");
    expect(isValid).toBe(false);
  });

  it("should return false when verifying with a malformed hash", async () => {
    const isValid = await passwordService.verify("not-a-valid-argon2-hash", "password");
    expect(isValid).toBe(false);
  });
});
