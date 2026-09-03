import Link from "next/link";

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col items-start justify-center px-6 text-white">
      <h1 className="font-oracle text-5xl italic">Oracle</h1>
      <p className="mt-4 font-mono text-sm text-white/60">
        An AI-powered financial decision simulator on BMONI&apos;s embedded Ethereum wallet
        infrastructure. Connect → Understand → Simulate → Stress Test → Decide → Act.
      </p>
      <div className="mt-8 flex gap-4">
        <Link href="/onboard" className="rounded bg-present px-5 py-2.5 font-mono text-sm text-base">
          Onboard a wallet
        </Link>
        <Link
          href="/simulator"
          className="rounded border border-white/30 px-5 py-2.5 font-mono text-sm text-white"
        >
          Open simulator
        </Link>
      </div>
      <p className="mt-10 font-mono text-xs text-white/30">
        No shared code, database, or auth with sepgate-app / sepgate-contract. Ethereum via BMONI,
        not Stellar.
      </p>
    </main>
  );
}
