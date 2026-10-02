/** Redacts a national ID to its last 4 digits. */
export function maskNationalId(nid: string | null | undefined): string | null {
  if (!nid) return null;
  if (nid.length <= 4) return "*".repeat(nid.length);
  return "*".repeat(nid.length - 4) + nid.slice(-4);
}

/** Masks the middle of a phone number, keeping the prefix and last 3 digits. */
export function maskPhone(phone: string | null | undefined): string | null {
  if (!phone) return null;
  if (phone.length <= 8) return "*".repeat(phone.length - 3) + phone.slice(-3);
  return phone.slice(0, 5) + "*".repeat(phone.length - 8) + phone.slice(-3);
}
