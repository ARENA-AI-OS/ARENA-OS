"use client";

import { ethers } from "ethers";

/**
 * Client-side EVM owner wallet, PIN-encrypted and stored in the browser.
 *
 * HONESTY NOTE (see README): this is NOT hardware-backed. BMONI's native
 * Flutter SDK keeps the owner key in the device's Secure Enclave / Android
 * Keystore. This web build keeps it AES-GCM-encrypted in localStorage,
 * decrypted only in memory when the PIN is entered to sign something. That
 * is a materially weaker guarantee — acceptable for a hackathon demo, not
 * for real funds. Do not present this as equivalent to the SDK's custody.
 */

const STORAGE_KEY = "oracle_owner_wallet_v1";
const PBKDF2_ITERATIONS = 210_000;

interface StoredWallet {
  address: string;
  salt: string; // base64
  iv: string; // base64
  ciphertext: string; // base64
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
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    enc.encode(pin),
    "PBKDF2",
    false,
    ["deriveKey"],
  );
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

/** Generates a new owner keypair and PIN-encrypts it into localStorage. Returns the address. */
export async function createAndStoreWallet(pin: string): Promise<string> {
  const wallet = ethers.Wallet.createRandom();
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(pin, salt);
  const enc = new TextEncoder();
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    enc.encode(wallet.privateKey),
  );

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
    plaintext = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv },
      key,
      fromBase64(stored.ciphertext),
    );
  } catch {
    throw new Error("Incorrect PIN.");
  }
  const privateKey = new TextDecoder().decode(plaintext);
  return new ethers.Wallet(privateKey);
}

/**
 * Owner-proof challenge (wallet creation). Signs the challenge TEXT with the
 * EIP-191 prefix — this is the "yes-prefix" side of BMONI's two signature
 * methods. Do not use this for proposal signing.
 */
export async function signOwnerProofChallenge(pin: string, message: string): Promise<string> {
  const wallet = await unlockWallet(pin);
  return wallet.signMessage(message);
}

/**
 * Proposal signing. Signs the raw 32-byte digest with NO EIP-191 prefix —
 * `signingKey.sign()`, never `signMessage()`. Using the wrong method here
 * produces a structurally valid signature that recovers to the wrong
 * address and is silently rejected by BMONI. See lib/bmoni.ts.
 */
export async function signRawDigest(pin: string, hashToSign: string): Promise<string> {
  const wallet = await unlockWallet(pin);
  return wallet.signingKey.sign(hashToSign).serialized;
}

export function clearStoredWallet() {
  localStorage.removeItem(STORAGE_KEY);
}
