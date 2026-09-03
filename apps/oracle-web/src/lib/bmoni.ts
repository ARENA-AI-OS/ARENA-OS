import "server-only";

/**
 * Server-only client for the BMONI Embedded REST API.
 *
 * Every function here was exercised live against the sandbox
 * (https://embedded-dev.bmoni.com) with the Bunch Dillon persona before
 * being written down — not transcribed from the docs unread. Where BMONI's
 * docs and the live API disagreed, the live API wins, and the discrepancy
 * is noted inline.
 *
 * BMONI_API_KEY must never reach the browser. Every function in this module
 * is server-only and sends the key as `x-api-key`.
 */

const BASE_URL = process.env.BMONI_BASE_URL ?? "https://embedded-dev.bmoni.com";
const API_KEY = process.env.BMONI_API_KEY;

export class BmoniError extends Error {
  status: number;
  body: unknown;
  constructor(status: number, body: unknown) {
    super(
      `BMONI API error ${status}: ${
        typeof body === "object" ? JSON.stringify(body) : String(body)
      }`,
    );
    this.status = status;
    this.body = body;
  }
}

function requireApiKey(): string {
  if (!API_KEY) {
    throw new Error(
      "BMONI_API_KEY is not set. Copy .env.example to .env.local and fill it in.",
    );
  }
  return API_KEY;
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: {
      "x-api-key": requireApiKey(),
      ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
    cache: "no-store",
  });

  const text = await res.text();
  const json = text ? JSON.parse(text) : null;

  if (!res.ok) throw new BmoniError(res.status, json ?? text);
  return json as T;
}

async function requestMultipart<T>(method: string, path: string, form: FormData): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: { "x-api-key": requireApiKey() },
    body: form,
    cache: "no-store",
  });

  const text = await res.text();
  const json = text ? JSON.parse(text) : null;

  if (!res.ok) throw new BmoniError(res.status, json ?? text);
  return json as T;
}

// ---------------------------------------------------------------------------
// Stage 1 — create the user
// ---------------------------------------------------------------------------

export interface CreateUserInput {
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string; // E.164
}

export interface BmoniUser {
  id: string;
  bmoniUserId: string;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  [key: string]: unknown;
}

/** Live response is `{ user: {...} }` — the quickstart doc's `{ data: {...} }` example is wrong. */
export async function createUser(input: CreateUserInput): Promise<BmoniUser> {
  const res = await request<{ user: BmoniUser }>("POST", "/v1/users", input);
  return res.user;
}

// ---------------------------------------------------------------------------
// Stage 2 — provision the smart wallet
// ---------------------------------------------------------------------------

/** Smart-wallet calls take the stablecoin code, not the fiat one. */
export const STABLECOIN_BY_CURRENCY = {
  USD: "USDB",
  NGN: "CNGN",
  CAD: "CADC",
  EUR: "EURe",
  GBP: "GBPe",
  MXN: "MEXe",
} as const;

export interface OwnerProofChallenge {
  challengeId: string;
  groupId: string;
  message: string;
  expiresAt: string;
}

/** No `{ data }` wrapper on the live response. */
export function requestOwnerProofChallenge(
  userId: string,
  currency: string,
  userOwnerAddress: string,
) {
  return request<OwnerProofChallenge>(
    "POST",
    `/v1/users/${userId}/smart-wallets/owner-proof-challenges`,
    { currency, userOwnerAddress },
  );
}

export interface SmartWallet {
  id: string;
  currency: string; // fiat code comes back here, e.g. "NGN", even though you sent "CNGN"
  walletAddress: string;
  isActive: boolean;
  [key: string]: unknown;
}

/** No `{ data }` wrapper. Field is `walletAddress`, not `address`. */
export function createManagedSmartWallet(
  userId: string,
  params: {
    currency: string;
    userOwnerAddress: string;
    ownerProofChallengeId: string;
    ownerProofSignature: string;
  },
) {
  return request<SmartWallet>(
    "POST",
    `/v1/users/${userId}/smart-wallets/create-managed`,
    params,
  );
}

// ---------------------------------------------------------------------------
// Stage 3 — KYC
// ---------------------------------------------------------------------------

export function getKycOptions(userId: string) {
  return request("GET", `/v1/users/${userId}/kyc/options`);
}

export function searchOccupations(userId: string, search: string) {
  return request("GET", `/v1/users/${userId}/kyc/occupations?search=${encodeURIComponent(search)}`);
}

/**
 * Real field is `address`, not `addressDetails` (the api-quickstart.md example
 * uses `addressDetails`/`street` — wrong; the OpenAPI schema and a live PATCH
 * both confirm `address`/`streetLine1`). `identificationNumbers[].number`,
 * not `.value`.
 */
export interface KycProfilePatch {
  personalInfo?: {
    firstName?: string;
    lastName?: string;
    middleName?: string;
    dateOfBirth?: string;
    gender?: string;
    phoneNumber?: string;
  };
  address?: {
    streetLine1?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    countryCode?: string;
  };
  employment?: {
    employmentStatus?: string;
    occupationCode?: string;
    employerName?: string;
  };
  sourceOfFunds?: string;
  estimatedMonthlyVolume?: number;
  accountPurpose?: string;
  actingAsIntermediary?: boolean;
  identificationNumbers?: Array<{ type: string; number: string; issuingCountryCode?: string }>;
}

export interface KycPatchResult {
  success: boolean;
  saved: Record<string, boolean | number>;
  canActivate: boolean;
  missing: string[];
}

export function patchKyc(userId: string, patch: KycProfilePatch) {
  return request<KycPatchResult>("PATCH", `/v1/users/${userId}/kyc`, patch);
}

export function getKycReadiness(userId: string) {
  return request("GET", `/v1/users/${userId}/kyc/readiness`);
}

export function getUsdReadiness(userId: string) {
  return request("GET", `/v1/users/${userId}/kyc/usd-readiness`);
}

/** CAD and NGN must omit the body. USD/EUR pass sumsubLevelName. */
export function activateKyc(userId: string, sumsubLevelName?: string) {
  return request(
    "POST",
    `/v1/users/${userId}/kyc/activate`,
    sumsubLevelName ? { sumsubLevelName } : undefined,
  );
}

export function bvnLookup(userId: string, bvn: string) {
  return request("GET", `/v1/users/${userId}/kyc/bvn-lookup/${bvn}`);
}

export function ninLookup(userId: string, nin: string) {
  return request("GET", `/v1/users/${userId}/kyc/nin-lookup/${nin}`);
}

// --- Document uploads --------------------------------------------------
//
// Verified live. Minimum file size is enforced (~2KB) — smaller files are
// rejected with `E101 File size must be at least 0.001953125MB`.
// Field names differ per document type; this is easy to get wrong by
// guessing, and the mistake fails silently as a generic 400.

export interface KycDocumentResult {
  id: string;
  type: string;
  status: "pending" | "verified" | "rejected" | string;
  [key: string]: unknown;
}

/** multipart field name: `files` (array — front, then back if provided). */
export function uploadIdentificationDocument(
  userId: string,
  file: Blob,
  filename: string,
  params: { type: string; documentNumber: string; issuingCountry: string },
) {
  const form = new FormData();
  form.append("files", file, filename);
  form.set("type", params.type);
  form.set("documentNumber", params.documentNumber);
  form.set("issuingCountry", params.issuingCountry);
  return requestMultipart<KycDocumentResult>(
    "POST",
    `/v1/users/${userId}/kyc/documents/identification`,
    form,
  );
}

/** multipart field name: `files` (array). */
export function uploadProofOfAddressDocument(
  userId: string,
  file: Blob,
  filename: string,
  type = "utility_bill",
) {
  const form = new FormData();
  form.append("files", file, filename);
  form.set("type", type);
  return requestMultipart<KycDocumentResult>(
    "POST",
    `/v1/users/${userId}/kyc/documents/proof-of-address`,
    form,
  );
}

/** multipart field name: `selfie` (array) — NOT `files`. Easy to miss. */
export function uploadBiometricDocument(userId: string, file: Blob, filename: string) {
  const form = new FormData();
  form.append("selfie", file, filename);
  form.set("type", "selfie");
  return requestMultipart<KycDocumentResult>(
    "POST",
    `/v1/users/${userId}/kyc/documents/biometric`,
    form,
  );
}

// ---------------------------------------------------------------------------
// Stage 4 — activate the rail
// ---------------------------------------------------------------------------

/**
 * Verified live: for Nigeria, this alone is enough to bring the NGN rail to
 * `active` — no document upload is required first. That contradicts the
 * general "uploads before rail activation" framing in BMONI's own lifecycle
 * docs, which describes the Global-KYC (USD/EUR/MXN) path. Documents are
 * still required for the USD Enhanced-Due-Diligence stage via `/kyc/activate`.
 */
export function startNigeria(
  userId: string,
  params: { bvn: string; ngnWalletAddress: string; ngnWalletIndex: number },
) {
  return request("POST", `/v1/users/${userId}/onboarding/start-nigeria`, params);
}

/** No `{ data }` wrapper. `anchorStatus` is the Nigeria/NGN rail's field. */
export interface OnboardingStatus {
  anchorStatus: string;
  bridgeStatus: string;
  moneriumStatus: string;
  paytrieStatus: string;
  etherfuseStatus: string;
}

export function getOnboardingStatus(userId: string) {
  return request<OnboardingStatus>("GET", `/v1/users/${userId}/onboarding/status`);
}

// ---------------------------------------------------------------------------
// Stage 5 — fund the wallet
// ---------------------------------------------------------------------------

export function registerNgnDepositAccount(userId: string, smartWalletId: string) {
  return request("POST", `/v1/users/${userId}/smart-wallets/${smartWalletId}/onramp/vba/nigeria`);
}

export function getNgnDepositAccount(userId: string) {
  return request("GET", `/v1/users/${userId}/bank-accounts/deposit-accounts/NGN`);
}

// ---------------------------------------------------------------------------
// Wallet home
// ---------------------------------------------------------------------------

export interface WalletBalance {
  smartWalletId: string;
  currency: string;
  balance: string;
  error: string | null;
}

/** No `{ data }` wrapper; field is `balance`, not `amount`. */
export function listBalances(userId: string) {
  return request<{ smartAccountAddress: string; balances: WalletBalance[] }>(
    "GET",
    `/v1/users/${userId}/smart-wallets/account/balances`,
  );
}

export function listWallets(userId: string) {
  return request<SmartWallet[]>("GET", `/v1/users/${userId}/smart-wallets/account/wallets`);
}

export interface SmartWalletTransaction {
  id: string;
  direction?: string;
  amount: string;
  currency: string;
  createdAt: string;
  [key: string]: unknown;
}

export function listTransactions(userId: string, smartWalletId: string) {
  return request<{ transactions: SmartWalletTransaction[]; total: number }>(
    "GET",
    `/v1/users/${userId}/smart-wallets/${smartWalletId}/transactions`,
  );
}

// ---------------------------------------------------------------------------
// Stage 6 — move money: proposal -> approve -> sign-payload -> sign
// ---------------------------------------------------------------------------

export interface Proposal {
  id: string;
  groupWalletId: string;
  proposalType: string;
  status: string;
  amount: string;
  currency: string;
  requiredApprovals: number;
  requiredSignatures: number;
  currentApprovals: number;
  currentSignatures: number;
  nextAction: string;
  [key: string]: unknown;
}

export function createTransferProposal(
  userId: string,
  smartWalletId: string,
  proposal: {
    type: "TRANSFER" | "SWAP";
    toAddress?: string;
    toUserId?: string;
    amount: string;
    currency: string;
    description?: string;
  },
) {
  return request<{ proposal: Proposal }>(
    "POST",
    `/v1/users/${userId}/smart-wallets/${smartWalletId}/proposals`,
    { proposal },
  );
}

/**
 * IMPORTANT: this endpoint is absent from BMONI's published OpenAPI spec
 * (embedded-dev.bmoni.com/docs/openapi.json has no `/approve` path for
 * proposals) but works live — verified with a real POST against the sandbox,
 * which returned 200 and recorded the approval. Worth flagging to BMONI;
 * built here because it demonstrably works, not because it's documented.
 */
export function approveProposal(userId: string, proposalId: string) {
  return request<{ proposal: Proposal }>(
    "POST",
    `/v1/users/${userId}/smart-wallets/proposals/${proposalId}/approve`,
  );
}

/**
 * Live field is `signingPayloadHash`, not `hashToSign` as BMONI's signing.md
 * doc example shows. Same 32-byte raw digest either way — sign it with NO
 * EIP-191 prefix (ethers: `wallet.signingKey.sign(hash).serialized`).
 */
export interface SignPayload {
  signingPayloadHash: string;
  typedData: unknown;
  signatureExpiresAt: string;
  proposalStatus: string;
}

export function getSignPayload(userId: string, proposalId: string) {
  return request<SignPayload>(
    "GET",
    `/v1/users/${userId}/smart-wallets/proposals/${proposalId}/sign-payload`,
  );
}

export function submitProposalSignature(userId: string, proposalId: string, signature: string) {
  return request<{ proposal: Proposal }>(
    "POST",
    `/v1/users/${userId}/smart-wallets/proposals/${proposalId}/sign`,
    { signature },
  );
}

export function getProposal(userId: string, proposalId: string) {
  return request<{ proposal: Proposal }>(
    "GET",
    `/v1/users/${userId}/smart-wallets/proposals/${proposalId}`,
  );
}

export function rejectProposal(userId: string, proposalId: string, reason?: string) {
  return request(
    "POST",
    `/v1/users/${userId}/smart-wallets/proposals/${proposalId}/reject`,
    reason ? { reason } : undefined,
  );
}

// ---------------------------------------------------------------------------
// Webhooks (Block D)
// ---------------------------------------------------------------------------

export function configureWebhook(params: {
  callbackUrl: string;
  events: string[];
  partnerId: string;
  active?: boolean;
}) {
  return request("POST", "/v1/webhooks/config", params);
}
