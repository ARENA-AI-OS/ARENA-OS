import { ethers } from "ethers";

/**
 * Client-side EVM owner wallet, PIN-encrypted and stored in the browser.
 * Framework-agnostic port of apps/oracle-web/src/lib/wallet-client.ts —
 * same algorithm, same honesty note, packaged for any React host.
 *
 * HONESTY NOTE: NOT hardware-backed. BMONI's native Flutter/React-Native
 * SDK keeps the owner key in the device's Secure Enclave / Android
 * Keystore. This is AES-GCM-encrypted localStorage — a materially weaker
 * guarantee. Fine for a demo integration; revisit before real funds touch
 * a browser-only deployment of this widget. See the package README.
 */

const STORAGE_KEY = "oracle_embed_owner_wallet_v1";
const PBKDF2_ITERATIONS = 210_000;

interface StoredWallet {
  address: string;
  salt: string;
  iv: string;
  ciphertext: string;
}

function toBase64(bytes: ArrayBuffer | Uint8Array): string {
  const arr = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  return btoa(String.fromCharCode(...arr));
}

function fromBase64(b64: string): Uint8Array<ArrayBuffer> {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

async function deriveKey(pin: string, salt: Uint8Array<ArrayBuffer>): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey("raw", enc.encode(pin), "PBKDF2", false, [
    "deriveKey",
  ]);
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt, iterations: PBKDF2_ITERATIONS, hash: "SHA-256" },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

export function hasStoredWallet(): boolean {
  return typeof window !== "undefined" && !!localStorage.getItem(STORAGE_KEY);
}

export function getStoredWalletAddress(): string | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  return (JSON.parse(raw) as StoredWallet).address;
}

export async function createAndStoreWallet(pin: string): Promise<string> {
  const wallet = ethers.Wallet.createRandom();
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(pin, salt);
  const enc = new TextEncoder();
  const ciphertext = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, enc.encode(wallet.privateKey));

  const stored: StoredWallet = {
    address: wallet.address,
    salt: toBase64(salt),
    iv: toBase64(iv),
    ciphertext: toBase64(ciphertext),
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
  return wallet.address;
}

async function unlockWallet(pin: string): Promise<ethers.Wallet> {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) throw new Error("No wallet stored in this browser.");
  const stored = JSON.parse(raw) as StoredWallet;
  const salt = fromBase64(stored.salt);
  const iv = fromBase64(stored.iv);
  const key = await deriveKey(pin, salt);
  let plaintext: ArrayBuffer;
  try {
    plaintext = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, fromBase64(stored.ciphertext));
  } catch {
    throw new Error("Incorrect PIN.");
  }
  return new ethers.Wallet(new TextDecoder().decode(plaintext));
}

/** EIP-191-prefixed signature — for BMONI's owner-proof challenge only. */
export async function signOwnerProofChallenge(pin: string, message: string): Promise<string> {
  const wallet = await unlockWallet(pin);
  return wallet.signMessage(message);
}

/** Raw digest, no prefix — for BMONI proposal signing only. */
export async function signRawDigest(pin: string, hashToSign: string): Promise<string> {
  const wallet = await unlockWallet(pin);
  return wallet.signingKey.sign(hashToSign).serialized;
}

export function clearStoredWallet() {
  localStorage.removeItem(STORAGE_KEY);
}
