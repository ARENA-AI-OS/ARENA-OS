"use client";

import { useEffect, useState, useCallback } from "react";
import {
  createAndStoreWallet,
  getStoredWalletAddress,
  hasStoredWallet,
  signOwnerProofChallenge,
} from "@/lib/wallet-client";

type Step =
  | "identity"
  | "wallet"
  | "kyc-profile"
  | "kyc-documents"
  | "activate-rail"
  | "polling"
  | "active";

interface SessionState {
  bmoniUserId: string;
  ownerAddress: string | null;
  smartWalletId: string | null;
  smartWalletAddress: string | null;
  step: string;
  bvn: string | null;
  onboardingStatus: { anchorStatus: string } | null;
}

const SANDBOX_PERSONA = {
  firstName: "Bunch",
  lastName: "Dillon",
  bvn: "95888168924",
};

function StatusBadge({ kind, children }: { kind: "real" | "mock" | "missing"; children: React.ReactNode }) {
  return <span className={`badge-${kind}`}>{children}</span>;
}

export default function OnboardPage() {
  const [step, setStep] = useState<Step>("identity");
  const [session, setSession] = useState<SessionState | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [log, setLog] = useState<string[]>([]);

  const pushLog = useCallback((msg: string) => setLog((l) => [...l.slice(-9), msg]), []);

  // --- identity form ---
  const [firstName, setFirstName] = useState(SANDBOX_PERSONA.firstName);
  const [lastName, setLastName] = useState(SANDBOX_PERSONA.lastName);
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  // --- wallet PIN ---
  const [pin, setPin] = useState("");

  // --- kyc profile ---
  const [bvn, setBvn] = useState(SANDBOX_PERSONA.bvn);
  const [dob, setDob] = useState("1990-01-15");
  const [gender, setGender] = useState("male");
  const [street, setStreet] = useState("15 Admiralty Way");
  const [city, setCity] = useState("Lagos");
  const [stateName, setStateName] = useState("Lagos");
  const [postalCode, setPostalCode] = useState("101241");

  // --- documents ---
  const [idFile, setIdFile] = useState<File | null>(null);
  const [idDocNumber, setIdDocNumber] = useState("A12345678");
  const [poaFile, setPoaFile] = useState<File | null>(null);
  const [uploadedDocs, setUploadedDocs] = useState<Record<string, string>>({});

  // Resume from server session on mount.
  useEffect(() => {
    fetch("/api/onboard/session")
      .then((r) => r.json())
      .then((data: { session: SessionState | null }) => {
        if (data.session) {
          setSession(data.session);
          if (data.session.onboardingStatus?.anchorStatus === "active") setStep("active");
          else if (data.session.smartWalletAddress) setStep("kyc-profile");
          else if (hasStoredWallet()) setStep("wallet");
        }
      })
      .catch(() => {});
  }, []);

  async function createUser() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/onboard/user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ firstName, lastName, email, phoneNumber: phone }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(JSON.stringify(data.error ?? data));
      pushLog(`User created: ${data.bmoniUserId}`);
      setSession((s) => ({ ...(s as SessionState), bmoniUserId: data.bmoniUserId }));
      setStep("wallet");
    } catch (e) {
      setError(String((e as Error).message));
    } finally {
      setBusy(false);
    }
  }

  async function provisionWallet() {
    setBusy(true);
    setError(null);
    try {
      if (pin.length < 4) throw new Error("Enter the PIN you chose for this wallet (min 4 digits).");

      let address = getStoredWalletAddress();
      if (!address) {
        address = await createAndStoreWallet(pin);
        pushLog(`Owner key generated in-browser: ${address}`);
      }

      const chRes = await fetch("/api/onboard/wallet-challenge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userOwnerAddress: address, currency: "CNGN" }),
      });
      const challenge = await chRes.json();
      if (!chRes.ok) throw new Error(JSON.stringify(challenge.error ?? challenge));
      pushLog("Owner-proof challenge received.");

      const signature = await signOwnerProofChallenge(pin, challenge.message);
      pushLog("Challenge signed client-side (EIP-191).");

      const walletRes = await fetch("/api/onboard/wallet-create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userOwnerAddress: address,
          ownerProofChallengeId: challenge.challengeId,
          ownerProofSignature: signature,
          currency: "CNGN",
        }),
      });
      const wallet = await walletRes.json();
      if (!walletRes.ok) throw new Error(JSON.stringify(wallet.error ?? wallet));
      pushLog(`Smart wallet deployed: ${wallet.walletAddress}`);

      setSession((s) => ({
        ...(s as SessionState),
        ownerAddress: address,
        smartWalletId: wallet.id,
        smartWalletAddress: wallet.walletAddress,
      }));
      setStep("kyc-profile");
    } catch (e) {
      setError(String((e as Error).message));
    } finally {
      setBusy(false);
    }
  }

  async function submitKycProfile() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/onboard/kyc", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          personalInfo: { firstName, lastName, dateOfBirth: dob, gender, phoneNumber: phone },
          address: { streetLine1: street, city, state: stateName, postalCode, countryCode: "NGA" },
          identificationNumbers: [{ type: "bvn", number: bvn, issuingCountryCode: "NGA" }],
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(JSON.stringify(data.error ?? data));
      pushLog(`KYC profile saved. Missing: ${(data.missing ?? []).join(", ") || "none"}`);
      setStep("kyc-documents");
    } catch (e) {
      setError(String((e as Error).message));
    } finally {
      setBusy(false);
    }
  }

  async function uploadDoc(kind: "identification" | "proof-of-address", file: File | null) {
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      const form = new FormData();
      form.set("kind", kind);
      form.set("file", file);
      if (kind === "identification") {
        form.set("documentType", "national_id");
        form.set("documentNumber", idDocNumber);
        form.set("issuingCountry", "NGA");
      }
      const res = await fetch("/api/onboard/kyc/documents", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(JSON.stringify(data.error ?? data));
      pushLog(`${kind} uploaded — status: ${data.status}`);
      setUploadedDocs((d) => ({ ...d, [kind]: data.status }));
    } catch (e) {
      setError(String((e as Error).message));
    } finally {
      setBusy(false);
    }
  }

  async function activateRail() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/onboard/start-nigeria", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bvn }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(JSON.stringify(data.error ?? data));
      pushLog(`Nigeria onboarding started: ${JSON.stringify(data.status)}`);
      setStep("polling");
      poll();
    } catch (e) {
      setError(String((e as Error).message));
    } finally {
      setBusy(false);
    }
  }

  async function poll() {
    for (let i = 0; i < 15; i++) {
      try {
        const res = await fetch("/api/onboard/status");
        const data = await res.json();
        if (!res.ok) throw new Error(JSON.stringify(data.error ?? data));
        pushLog(`onboarding/status -> anchorStatus: ${data.anchorStatus}`);
        if (data.anchorStatus === "active") {
          setStep("active");
          return;
        }
      } catch (e) {
        setError(`Polling failed: ${String((e as Error).message)}. Retry from the button below.`);
        setStep("activate-rail");
        return;
      }
      await new Promise((r) => setTimeout(r, 1500));
    }
    setError("Still not active after 15 polls. BMONI's rail may be taking longer than usual — retry below.");
    setStep("activate-rail");
  }

  return (
    <main className="mx-auto min-h-screen max-w-2xl px-6 py-16 text-white">
      <div className="mb-8 flex items-center justify-between">
        <h1 className="font-oracle text-3xl">Onboard</h1>
        <StatusBadge kind="real">Live BMONI sandbox</StatusBadge>
      </div>

      <p className="mb-8 font-mono text-sm text-white/60">
        Six-stage lifecycle: user → wallet → KYC → rail → fund → move money. Every call on this
        page hits BMONI&apos;s real sandbox — nothing here is mocked.
      </p>

      {error && (
        <div className="mb-6 rounded border border-risk/50 bg-risk/10 p-3 font-mono text-sm text-risk">
          {error}
        </div>
      )}

      {step === "identity" && (
        <section className="space-y-4">
          <div className="rounded border border-present/40 bg-present/5 p-3 font-mono text-xs text-present">
            Sandbox test persona (Bunch Dillon, BVN {SANDBOX_PERSONA.bvn}). Never use this for a
            real KYC submission. Email and phone must be unique — fill in your own.
          </div>
          <label className="block">
            <span className="text-sm text-white/70">First name</span>
            <input
              className="mt-1 w-full rounded border border-white/20 bg-transparent px-3 py-2 font-mono"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
            />
          </label>
          <label className="block">
            <span className="text-sm text-white/70">Last name</span>
            <input
              className="mt-1 w-full rounded border border-white/20 bg-transparent px-3 py-2 font-mono"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
            />
          </label>
          <label className="block">
            <span className="text-sm text-white/70">Email (must be unique)</span>
            <input
              className="mt-1 w-full rounded border border-white/20 bg-transparent px-3 py-2 font-mono"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you+oracle@example.com"
            />
          </label>
          <label className="block">
            <span className="text-sm text-white/70">Phone (E.164, must be unique)</span>
            <input
              className="mt-1 w-full rounded border border-white/20 bg-transparent px-3 py-2 font-mono"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+2348012345678"
            />
          </label>
          <button
            disabled={busy || !email || !phone}
            onClick={createUser}
            className="rounded bg-present px-4 py-2 font-mono text-sm text-base disabled:opacity-40"
          >
            {busy ? "Creating…" : "Create BMONI user"}
          </button>
        </section>
      )}

      {step === "wallet" && (
        <section className="space-y-4">
          <p className="font-mono text-sm text-white/70">
            Generates an EVM owner keypair in this browser, PIN-encrypts it into localStorage, and
            registers it as the smart wallet&apos;s owner.
          </p>
          <div className="rounded border border-risk/40 bg-risk/5 p-3 font-mono text-xs text-risk">
            Not hardware-backed. This is a browser-held key, not the Secure Enclave / Android
            Keystore BMONI&apos;s native SDK uses. See README before using this with real funds.
          </div>
          <label className="block">
            <span className="text-sm text-white/70">Choose a PIN (min 4 digits)</span>
            <input
              type="password"
              className="mt-1 w-full rounded border border-white/20 bg-transparent px-3 py-2 font-mono"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
            />
          </label>
          <button
            disabled={busy}
            onClick={provisionWallet}
            className="rounded bg-present px-4 py-2 font-mono text-sm text-base disabled:opacity-40"
          >
            {busy ? "Provisioning…" : "Provision smart wallet"}
          </button>
        </section>
      )}

      {step === "kyc-profile" && (
        <section className="space-y-4">
          <label className="block">
            <span className="text-sm text-white/70">BVN (11 digits — sandbox: {SANDBOX_PERSONA.bvn})</span>
            <input
              className="mt-1 w-full rounded border border-white/20 bg-transparent px-3 py-2 font-mono"
              value={bvn}
              onChange={(e) => setBvn(e.target.value)}
            />
          </label>
          <div className="grid grid-cols-2 gap-4">
            <label className="block">
              <span className="text-sm text-white/70">Date of birth</span>
              <input
                type="date"
                className="mt-1 w-full rounded border border-white/20 bg-transparent px-3 py-2 font-mono"
                value={dob}
                onChange={(e) => setDob(e.target.value)}
              />
            </label>
            <label className="block">
              <span className="text-sm text-white/70">Gender</span>
              <select
                className="mt-1 w-full rounded border border-white/20 bg-base px-3 py-2 font-mono"
                value={gender}
                onChange={(e) => setGender(e.target.value)}
              >
                <option value="male">Male</option>
                <option value="female">Female</option>
              </select>
            </label>
          </div>
          <label className="block">
            <span className="text-sm text-white/70">Street</span>
            <input
              className="mt-1 w-full rounded border border-white/20 bg-transparent px-3 py-2 font-mono"
              value={street}
              onChange={(e) => setStreet(e.target.value)}
            />
          </label>
          <div className="grid grid-cols-3 gap-4">
            <label className="block">
              <span className="text-sm text-white/70">City</span>
              <input
                className="mt-1 w-full rounded border border-white/20 bg-transparent px-3 py-2 font-mono"
                value={city}
                onChange={(e) => setCity(e.target.value)}
              />
            </label>
            <label className="block">
              <span className="text-sm text-white/70">State</span>
              <input
                className="mt-1 w-full rounded border border-white/20 bg-transparent px-3 py-2 font-mono"
                value={stateName}
                onChange={(e) => setStateName(e.target.value)}
              />
            </label>
            <label className="block">
              <span className="text-sm text-white/70">Postal code</span>
              <input
                className="mt-1 w-full rounded border border-white/20 bg-transparent px-3 py-2 font-mono"
                value={postalCode}
                onChange={(e) => setPostalCode(e.target.value)}
              />
            </label>
          </div>
          <button
            disabled={busy}
            onClick={submitKycProfile}
            className="rounded bg-present px-4 py-2 font-mono text-sm text-base disabled:opacity-40"
          >
            {busy ? "Saving…" : "Save KYC profile"}
          </button>
        </section>
      )}

      {step === "kyc-documents" && (
        <section className="space-y-6">
          <div className="rounded border border-healthy-future/40 bg-healthy-future/5 p-3 font-mono text-xs text-healthy-future">
            Verified live: Nigeria&apos;s NGN rail activates from BVN + wallet alone — documents
            are NOT required to reach &quot;active&quot; here. They ARE required for the USD
            Enhanced-Due-Diligence stage. Uploaded anyway, for the compliance record.
          </div>

          <div className="space-y-2">
            <p className="text-sm text-white/70">
              Identification document {uploadedDocs.identification && <StatusBadge kind="real">{uploadedDocs.identification}</StatusBadge>}
            </p>
            <input
              className="mt-1 w-full rounded border border-white/20 bg-transparent px-3 py-2 font-mono text-xs"
              value={idDocNumber}
              onChange={(e) => setIdDocNumber(e.target.value)}
              placeholder="Document number"
            />
            <input
              type="file"
              accept="image/jpeg,image/png"
              onChange={(e) => setIdFile(e.target.files?.[0] ?? null)}
              className="block w-full text-sm text-white/70"
            />
            <button
              disabled={busy || !idFile}
              onClick={() => uploadDoc("identification", idFile)}
              className="rounded border border-present px-3 py-1.5 font-mono text-xs text-present disabled:opacity-40"
            >
              Upload identification (min ~2KB JPEG/PNG)
            </button>
          </div>

          <div className="space-y-2">
            <p className="text-sm text-white/70">
              Proof of address {uploadedDocs["proof-of-address"] && <StatusBadge kind="real">{uploadedDocs["proof-of-address"]}</StatusBadge>}
            </p>
            <input
              type="file"
              accept="image/jpeg,image/png"
              onChange={(e) => setPoaFile(e.target.files?.[0] ?? null)}
              className="block w-full text-sm text-white/70"
            />
            <button
              disabled={busy || !poaFile}
              onClick={() => uploadDoc("proof-of-address", poaFile)}
              className="rounded border border-present px-3 py-1.5 font-mono text-xs text-present disabled:opacity-40"
            >
              Upload proof of address
            </button>
          </div>

          <div className="rounded border border-risk/30 p-3 font-mono text-xs text-risk">
            Biometric capture UI: not built. BMONI&apos;s endpoint
            (POST /kyc/documents/biometric, field name `selfie`) is wired in lib/bmoni.ts but has
            no camera capture UI yet — required for USD/EUR/MXN, not for NGN. <StatusBadge kind="missing">missing</StatusBadge>
          </div>

          <button
            onClick={() => setStep("activate-rail")}
            className="rounded bg-present px-4 py-2 font-mono text-sm text-base"
          >
            Continue to rail activation
          </button>
        </section>
      )}

      {step === "activate-rail" && (
        <section className="space-y-4">
          <p className="font-mono text-sm text-white/70">
            Calls POST /onboarding/start-nigeria with BVN {bvn} and the deployed wallet address.
          </p>
          <button
            disabled={busy}
            onClick={activateRail}
            className="rounded bg-present px-4 py-2 font-mono text-sm text-base disabled:opacity-40"
          >
            {busy ? "Starting…" : "Activate Nigeria rail"}
          </button>
        </section>
      )}

      {step === "polling" && (
        <section>
          <p className="font-mono text-sm text-white/70">
            Polling GET /onboarding/status… (production should use the onboarding.completed /
            kyc.action_required webhooks instead — see Block D in README)
          </p>
        </section>
      )}

      {step === "active" && (
        <section className="space-y-4">
          <div className="rounded border border-healthy-future/50 bg-healthy-future/10 p-4">
            <p className="font-oracle text-xl text-healthy-future">Rail active.</p>
            <p className="font-mono text-sm text-white/70">
              Wallet {session?.smartWalletAddress} can now be funded and used in the simulator.
            </p>
          </div>
          <a href="/simulator" className="inline-block rounded bg-present px-4 py-2 font-mono text-sm text-base">
            Go to simulator →
          </a>
        </section>
      )}

      <div className="mt-12 border-t border-white/10 pt-4">
        <p className="mb-2 font-mono text-xs uppercase tracking-wider text-white/40">Call log</p>
        <ul className="space-y-1 font-mono text-xs text-white/50">
          {log.map((l, i) => (
            <li key={i}>{l}</li>
          ))}
        </ul>
      </div>
    </main>
  );
}
