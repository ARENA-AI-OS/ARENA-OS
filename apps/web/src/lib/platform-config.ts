// Per-platform connection configuration.
// Defines the correct connection method for each platform.

export type ConnectMethod = "oauth" | "token" | "url_key" | "json_upload" | "wallet" | "custom";

export interface PlatformConfig {
  id: string;
  label: string;
  method: ConnectMethod;
  icon: string;
  description: string;
  // For OAuth platforms
  oauthUrl?: string;
  oauthScopes?: string[];
  // For token/key platforms
  fields?: ConnectField[];
  // Help text for where to find credentials
  helpUrl?: string;
  helpText?: string;
  // Capabilities this connection grants
  capabilities: string[];
  // Network selector (for Stellar)
  networkSelectable?: boolean;
}

export interface ConnectField {
  key: string;
  label: string;
  type: "text" | "password" | "textarea" | "select" | "file";
  placeholder?: string;
  required?: boolean;
  options?: { value: string; label: string }[];
  helpText?: string;
  sensitive?: boolean; // field contains a secret
}

export const PLATFORM_CONFIGS: PlatformConfig[] = [
  // ─── AI Providers ───
  {
    id: "openai",
    label: "OpenAI",
    method: "token",
    icon: "◉",
    description: "GPT-4, GPT-4o, GPT-3.5 — general-purpose AI models",
    fields: [
      {
        key: "api_key",
        label: "API Key",
        type: "password",
        placeholder: "sk-proj-...",
        required: true,
        sensitive: true,
        helpText: "Find your key at platform.openai.com/api-keys",
      },
    ],
    helpUrl: "https://platform.openai.com/api-keys",
    capabilities: ["openai:complete"],
  },
  {
    id: "gemini",
    label: "Google Gemini",
    method: "token",
    icon: "◎",
    description: "Gemini Pro, Gemini Flash — Google's AI models",
    fields: [
      {
        key: "api_key",
        label: "API Key",
        type: "password",
        placeholder: "AIza...",
        required: true,
        sensitive: true,
        helpText: "Find your key at aistudio.google.com/apikey",
      },
    ],
    helpUrl: "https://aistudio.google.com/apikey",
    capabilities: ["gemini:complete"],
  },
  {
    id: "claude",
    label: "Anthropic Claude",
    method: "token",
    icon: "◈",
    description: "Claude 3.5, Claude 3 — Anthropic's AI models",
    fields: [
      {
        key: "api_key",
        label: "API Key",
        type: "password",
        placeholder: "sk-ant-...",
        required: true,
        sensitive: true,
        helpText: "Find your key at console.anthropic.com/settings/keys",
      },
    ],
    helpUrl: "https://console.anthropic.com/settings/keys",
    capabilities: ["claude:complete"],
  },

  // ─── Source Control ───
  {
    id: "github",
    label: "GitHub",
    method: "oauth",
    icon: "⌨",
    description: "Repository access, issues, pull requests, CI/CD",
    oauthUrl: "https://github.com/login/oauth/authorize",
    oauthScopes: ["repo", "read:user", "read:org"],
    capabilities: [
      "github:read_repository",
      "github:create_branch",
      "github:write_files",
      "github:create_commit",
      "github:create_pull_request",
      "github:read_checks",
    ],
  },

  // ─── Backend / Data ───
  {
    id: "supabase",
    label: "Supabase",
    method: "url_key",
    icon: "⚡",
    description: "PostgreSQL database, auth, storage, edge functions",
    fields: [
      {
        key: "project_url",
        label: "Project URL",
        type: "text",
        placeholder: "https://xxxx.supabase.co",
        required: true,
        helpText: "Find in Project Settings → API → Project URL",
      },
      {
        key: "anon_key",
        label: "Anon Key",
        type: "password",
        placeholder: "eyJ...",
        required: true,
        sensitive: true,
        helpText: "Project Settings → API → anon public (safe for client)",
      },
      {
        key: "service_key",
        label: "Service Role Key (optional)",
        type: "password",
        placeholder: "eyJ...",
        sensitive: true,
        helpText: "⚠️ Grants full admin access. Use only for server-side operations. Found in Project Settings → API → service_role.",
      },
    ],
    helpUrl: "https://supabase.com/dashboard/project/_/settings/api",
    capabilities: ["supabase:read_database", "supabase:write_database"],
  },
  {
    id: "firebase",
    label: "Firebase",
    method: "token",
    icon: "◈",
    description: "Firestore, auth, storage, cloud functions",
    fields: [
      {
        key: "project_id",
        label: "Project ID",
        type: "text",
        placeholder: "my-project-id",
        required: true,
        helpText: "Firebase Console → Project Settings → General",
      },
      {
        key: "api_key",
        label: "Web API Key",
        type: "password",
        placeholder: "AIza...",
        required: true,
        sensitive: true,
        helpText: "Firebase Console → Project Settings → General → Web API Key",
      },
      {
        key: "service_account",
        label: "Service Account JSON (optional)",
        type: "textarea",
        placeholder: '{"type": "service_account", ...}',
        sensitive: true,
        helpText: "Firebase Console → Project Settings → Service Accounts → Generate new private key. Grants admin-level access.",
      },
    ],
    helpUrl: "https://console.firebase.google.com/project/_/settings/general",
    capabilities: ["firebase:read_firestore", "firebase:write_firestore"],
  },

  // ─── Deployment ───
  {
    id: "railway",
    label: "Railway",
    method: "token",
    icon: "▸",
    description: "Application hosting, preview deploys, databases",
    fields: [
      {
        key: "api_token",
        label: "API Token",
        type: "password",
        placeholder: "railway_...",
        required: true,
        sensitive: true,
        helpText: "Railway Dashboard → Account Settings → Tokens → Create Token",
      },
    ],
    helpUrl: "https://railway.app/account/tokens",
    capabilities: ["railway:read_project", "railway:deploy_preview", "railway:read_logs"],
  },
  {
    id: "render",
    label: "Render",
    method: "token",
    icon: "▹",
    description: "Web services, static sites, databases",
    fields: [
      {
        key: "api_key",
        label: "API Key",
        type: "password",
        placeholder: "rnd_...",
        required: true,
        sensitive: true,
        helpText: "Render Dashboard → Account Settings → API Keys → Create API Key",
      },
    ],
    helpUrl: "https://dashboard.render.com/settings#api-keys",
    capabilities: ["render:list_projects", "render:deploy_preview", "render:get_logs"],
  },
  {
    id: "vercel",
    label: "Vercel",
    method: "oauth",
    icon: "△",
    description: "Frontend hosting, serverless functions, edge network",
    oauthUrl: "https://vercel.com/integrations/authorize",
    oauthScopes: ["deployments", "projects"],
    capabilities: [
      "vercel:list_projects",
      "vercel:deploy_preview",
      "vercel:deploy_production",
      "vercel:get_domains",
    ],
  },

  // ─── Web3 ───
  {
    id: "stellar_testnet",
    label: "Stellar Testnet",
    method: "token",
    icon: "✦",
    description: "Test network for development — no real funds at risk",
    networkSelectable: false,
    fields: [
      {
        key: "secret_key",
        label: "Testnet Secret Key (for automation)",
        type: "password",
        placeholder: "S...",
        sensitive: true,
        helpText: "⚠️ Only for automated testing. For signing transactions, use a wallet extension instead. Generate at laboratory.stellar.org",
      },
    ],
    helpUrl: "https://laboratory.stellar.org/#account/create",
    capabilities: ["stellar:read_wallet", "stellar:prepare_transaction", "stellar:submit_transaction"],
  },
  {
    id: "stellar_mainnet",
    label: "Stellar Mainnet",
    method: "token",
    icon: "✦",
    description: "Live network — real XLM transactions",
    networkSelectable: false,
    fields: [
      {
        key: "secret_key",
        label: "Mainnet Secret Key",
        type: "password",
        placeholder: "S...",
        sensitive: true,
        helpText: "⚠️ This controls real funds. Store only through the encrypted security module. Never share or expose.",
      },
    ],
    capabilities: ["stellar:read_wallet", "stellar:prepare_transaction", "stellar:submit_transaction", "stellar:spend"],
  },
];

export function getPlatformConfig(platformId: string): PlatformConfig | undefined {
  return PLATFORM_CONFIGS.find((p) => p.id === platformId);
}

export function getOAuthRedirectUrl(platformId: string, origin: string): string {
  const config = getPlatformConfig(platformId);
  if (!config || config.method !== "oauth") return "";

  const state = crypto.randomUUID();

  switch (platformId) {
    case "github": {
      const clientId = process.env.GITHUB_CLIENT_ID || "";
      const scopes = config.oauthScopes?.join(" ") || "repo";
      return `${config.oauthUrl}?client_id=${clientId}&scope=${encodeURIComponent(scopes)}&state=${state}&redirect_uri=${encodeURIComponent(`${origin}/api/auth/callback/github`)}`;
    }
    case "vercel": {
      const clientId = process.env.VERCEL_CLIENT_ID || "";
      return `${config.oauthUrl}?client_id=${clientId}&state=${state}&redirect_uri=${encodeURIComponent(`${origin}/api/auth/callback/vercel`)}`;
    }
    default:
      return "";
  }
}
