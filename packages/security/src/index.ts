// @arena-os/security
// Encrypted secrets store and security utilities.
//
// DESIGN PRINCIPLES:
// 1. Secrets are NEVER readable in plaintext outside this module.
// 2. Secrets are NEVER interpolated directly into AI prompts.
// 3. All access is auditable via the SecurityAuditLog.
// 4. The module uses AES-256-GCM for encryption with a master key
//    derived from the ARENA_ENCRYPTION_KEY env var.

import { createCipheriv, createDecipheriv, randomBytes, createHash } from "node:crypto";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface EncryptedSecret {
  /** Unique identifier for this secret */
  id: string;
  /** Human-readable name (e.g. "openai-api-key") */
  name: string;
  /** Encrypted value — never plaintext */
  encryptedValue: string;
  /** AES-256-GCM initialization vector (hex) */
  iv: string;
  /** AES-256-GCM auth tag (hex) */
  tag: string;
  /** When the secret was created */
  createdAt: string;
  /** When the secret was last accessed (never logged in plaintext) */
  lastAccessedAt?: string;
  /** Who last accessed this secret */
  lastAccessedBy?: string;
  /** Optional expiration */
  expiresAt?: string;
}

export interface AuditEntry {
  id: string;
  at: string;
  action: "encrypt" | "decrypt" | "rotate" | "delete" | "access_denied";
  secretId: string;
  actor: string;
  /** Why access was denied (only for access_denied) */
  reason?: string;
}

// ---------------------------------------------------------------------------
// Master key derivation
// ---------------------------------------------------------------------------

function getMasterKey(): Buffer {
  const raw = process.env.ARENA_ENCRYPTION_KEY;
  if (!raw) {
    // In development, derive a key from the session secret.
    // In production, ARENA_ENCRYPTION_KEY MUST be set.
    const devSecret = process.env.ARENA_SESSION_SECRET || "dev-only-change-me";
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        "ARENA_ENCRYPTION_KEY is required in production. " +
        "Generate one with: openssl rand -hex 32"
      );
    }
    return createHash("sha256").update(devSecret).digest();
  }
  return createHash("sha256").update(raw).digest();
}

// ---------------------------------------------------------------------------
// Encryption / Decryption
// ---------------------------------------------------------------------------

const ALGORITHM = "aes-256-gcm";

export function encryptSecret(plaintext: string): {
  encryptedValue: string;
  iv: string;
  tag: string;
} {
  const key = getMasterKey();
  const iv = randomBytes(16);
  const cipher = createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(plaintext, "utf8", "hex");
  encrypted += cipher.final("hex");
  const tag = cipher.getAuthTag();

  return {
    encryptedValue: encrypted,
    iv: iv.toString("hex"),
    tag: tag.toString("hex"),
  };
}

/**
 * Decrypt a secret value. Returns the plaintext ONLY within this module's
 * process scope — callers receive the value transiently and must not store
 * or log it.
 *
 * WARNING: Never pass decrypted values to AI model prompts. Use the
 * `getSecretForPrompt` method which returns a redacted reference instead.
 */
export function decryptSecret(enc: {
  encryptedValue: string;
  iv: string;
  tag: string;
}): string {
  const key = getMasterKey();
  const decipher = createDecipheriv(
    ALGORITHM,
    key,
    Buffer.from(enc.iv, "hex"),
  );
  decipher.setAuthTag(Buffer.from(enc.tag, "hex"));

  let decrypted = decipher.update(enc.encryptedValue, "hex", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
}

/**
 * Returns a safe reference string for use in AI prompts.
 * e.g. "secret:openai-api-key" — never the actual value.
 *
 * The model gateway will resolve this reference server-side when it
 * actually needs the credential for an API call.
 */
export function getSecretRef(name: string): string {
  return `secret:${name}`;
}

// ---------------------------------------------------------------------------
// Secrets Store (in-memory for MVP, backed by DB in production)
// ---------------------------------------------------------------------------

export class SecretsStore {
  private secrets = new Map<string, EncryptedSecret>();
  private auditLog: AuditEntry[] = [];

  /**
   * Store an encrypted secret. The plaintext is never retained.
   */
  set(name: string, plaintext: string, options?: {
    actor?: string;
    expiresAt?: string;
  }): EncryptedSecret {
    const { encryptedValue, iv, tag } = encryptSecret(plaintext);
    const id = `sec_${createHash("sha256").update(name).digest("hex").slice(0, 12)}`;
    const now = new Date().toISOString();

    const secret: EncryptedSecret = {
      id,
      name,
      encryptedValue,
      iv,
      tag,
      createdAt: now,
      expiresAt: options?.expiresAt,
    };

    this.secrets.set(id, secret);
    this.audit("encrypt", id, options?.actor ?? "system");
    return secret;
  }

  /**
   * Decrypt a secret by name. Access is auditable.
   * Returns null if not found or expired.
   */
  get(name: string, options?: { actor?: string }): string | null {
    const entry = Array.from(this.secrets.values()).find((s) => s.name === name);
    if (!entry) {
      this.audit("access_denied", "unknown", options?.actor ?? "system", "not found");
      return null;
    }

    if (entry.expiresAt && new Date(entry.expiresAt) < new Date()) {
      this.audit("access_denied", entry.id, options?.actor ?? "system", "expired");
      return null;
    }

    entry.lastAccessedAt = new Date().toISOString();
    entry.lastAccessedBy = options?.actor;
    this.audit("decrypt", entry.id, options?.actor ?? "system");
    return decryptSecret(entry);
  }

  /**
   * Check if a secret exists (without decrypting it).
   */
  has(name: string): boolean {
    return Array.from(this.secrets.values()).some((s) => s.name === name);
  }

  /**
   * Rotate a secret (re-encrypt with new ciphertext).
   */
  rotate(name: string, newPlaintext: string, options?: { actor?: string }): EncryptedSecret | null {
    const existing = Array.from(this.secrets.values()).find((s) => s.name === name);
    if (!existing) return null;

    const { encryptedValue, iv, tag } = encryptSecret(newPlaintext);
    const updated: EncryptedSecret = {
      ...existing,
      encryptedValue,
      iv,
      tag,
      createdAt: new Date().toISOString(),
    };

    this.secrets.set(existing.id, updated);
    this.audit("rotate", existing.id, options?.actor ?? "system");
    return updated;
  }

  /**
   * Delete a secret.
   */
  delete(name: string, options?: { actor?: string }): boolean {
    const entry = Array.from(this.secrets.values()).find((s) => s.name === name);
    if (!entry) return false;
    this.secrets.delete(entry.id);
    this.audit("delete", entry.id, options?.actor ?? "system");
    return true;
  }

  /**
   * Get the audit log (for the Settings page / audit trail).
   */
  getAuditLog(): AuditEntry[] {
    return [...this.auditLog];
  }

  /**
   * List all secret names (never values).
   */
  listNames(): string[] {
    return Array.from(this.secrets.values()).map((s) => s.name);
  }

  private audit(action: AuditEntry["action"], secretId: string, actor: string, reason?: string) {
    this.auditLog.push({
      id: `aud_${randomBytes(8).toString("hex")}`,
      at: new Date().toISOString(),
      action,
      secretId,
      actor,
      reason,
    });
  }
}

// ---------------------------------------------------------------------------
// Singleton store for the application
// ---------------------------------------------------------------------------

let _store: SecretsStore | null = null;

export function getSecretsStore(): SecretsStore {
  if (!_store) {
    _store = new SecretsStore();
  }
  return _store;
}

// ---------------------------------------------------------------------------
// Convenience: load provider secrets from env into the encrypted store
// ---------------------------------------------------------------------------

export function loadEnvSecrets(): void {
  const store = getSecretsStore();
  const envKeys = [
    "OPENAI_API_KEY",
    "GEMINI_API_KEY",
    "ANTHROPIC_API_KEY",
    "GITHUB_TOKEN",
    "SUPABASE_URL",
    "SUPABASE_SERVICE_KEY",
    "RAILWAY_TOKEN",
    "FIREBASE_PROJECT_ID",
    "STELLAR_SECRET_KEY",
    "X402_FACILITATOR_URL",
  ];

  for (const key of envKeys) {
    const value = process.env[key];
    if (value && !store.has(key.toLowerCase().replace(/_/g, "-"))) {
      store.set(key.toLowerCase().replace(/_/g, "-"), value, { actor: "env-loader" });
    }
  }
}
