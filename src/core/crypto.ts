import { createHash, createHmac } from "node:crypto";

// Portable crypto helpers. Uses Node's crypto module directly so behavior is
// consistent across Node 18+ without relying on the global webcrypto object.

export function sha256Hex(input: string): string {
  return "sha256:" + createHash("sha256").update(input).digest("hex");
}

export function hmacHex(data: string, secret: string): string {
  return createHmac("sha256", secret).update(data).digest("hex");
}
