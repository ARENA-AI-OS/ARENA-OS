// Portable crypto helpers using the Web Crypto API, which is available in both
// Node.js (18+) and the Edge runtime. This allows the module to be used in
// middleware (Edge) and API routes (Node) without issues.

function getSubtle(): SubtleCrypto {
  if (typeof globalThis.crypto !== "undefined" && globalThis.crypto.subtle) {
    return globalThis.crypto.subtle;
  }
  throw new Error("Web Crypto API (globalThis.crypto.subtle) is not available");
}

function toHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function sha256Hex(input: string): Promise<string> {
  const s = getSubtle();
  const data = new TextEncoder().encode(input);
  const hash = await s.digest("SHA-256", data);
  return "sha256:" + toHex(hash);
}

export async function hmacHex(data: string, secret: string): Promise<string> {
  const s = getSubtle();
  const keyData = new TextEncoder().encode(secret);
  const key = await s.importKey(
    "raw",
    keyData,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await s.sign("HMAC", key, new TextEncoder().encode(data));
  return toHex(signature);
}
