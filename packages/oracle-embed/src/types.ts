/**
 * The Oracle API contract this widget speaks. apps/oracle-web is the
 * reference implementation — any backend that implements these five
 * routes (self-hosted, or BMONI's own) works with this widget unmodified.
 */
export interface OracleApiContract {
  "GET /api/balances": { smartAccountAddress: string; balances: { currency: string; balance: string }[] };
  "POST /api/proposals/recommend": {
    request: { toAddress: string; amount: number; currency?: string; description?: string };
    response: {
      netProposal: { id: string; status: string; amount: string };
      feeProposal: { id: string; status: string; amount: string } | null;
      split: { grossAmount: number; feeAmount: number; netAmount: number; feeBps: number };
    };
  };
  "POST /api/proposals/:id/approve": { proposal: { id: string; status: string; currentApprovals: number } };
  "GET /api/proposals/:id/sign-payload": { signingPayloadHash: string };
  "POST /api/proposals/:id/sign": { proposal: { id: string; status: string } };
  "GET /api/proposals/:id": { proposal: { id: string; status: string } };
}

export interface Balance {
  currency: string;
  balance: string;
}

export interface FeeSplit {
  grossAmount: number;
  feeAmount: number;
  netAmount: number;
  feeBps: number;
}
