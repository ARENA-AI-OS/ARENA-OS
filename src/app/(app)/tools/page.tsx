import { TOOL_REGISTRY } from "@tools/registry";
import { Panel, PanelHeader, Badge, PageHeader, StatusDot } from "@/components/ui";

export const dynamic = "force-dynamic";

const PROVIDER_GROUPS = [
  { key: "github", label: "GitHub", icon: "⎇", description: "Repository operations" },
  { key: "terminal", label: "Terminal", icon: "▸", description: "Controlled shell operations" },
  { key: "supabase", label: "Supabase", icon: "⚡", description: "Database operations" },
  { key: "firebase", label: "Firebase", icon: "🔥", description: "Firestore operations" },
  { key: "railway", label: "Railway", icon: "🚂", description: "Deployment operations" },
  { key: "payment", label: "Payments", icon: "$", description: "x402 payment protocol" },
  { key: "stellar", label: "Stellar", icon: "✷", description: "Blockchain anchoring" },
];

export default function ToolsPage() {
  const tools = Object.values(TOOL_REGISTRY);

  // Group tools by provider
  const grouped = PROVIDER_GROUPS.map((group) => ({
    ...group,
    tools: tools.filter((t) => {
      if (group.key === "github") return t.name.startsWith("github.");
      if (group.key === "terminal") return t.name.startsWith("terminal.");
      if (group.key === "supabase") return t.name.startsWith("supabase.");
      if (group.key === "firebase") return t.name.startsWith("firebase.");
      if (group.key === "railway") return t.name.startsWith("railway.");
      if (group.key === "payment") return t.name.startsWith("payment.");
      if (group.key === "stellar") return t.name.startsWith("stellar.");
      return false;
    }),
  })).filter((g) => g.tools.length > 0);

  return (
    <div className="bg-arena-grid min-h-screen">
      <PageHeader title="Tools" subtitle={`${tools.length} tools across ${PROVIDER_GROUPS.length} providers. All calls flow through the Tool Gateway.`} />
      <div className="px-6 py-6 space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {PROVIDER_GROUPS.map((group) => {
            const count = tools.filter((t) => {
              if (group.key === "github") return t.name.startsWith("github.");
              if (group.key === "terminal") return t.name.startsWith("terminal.");
              if (group.key === "supabase") return t.name.startsWith("supabase.");
              if (group.key === "firebase") return t.name.startsWith("firebase.");
              if (group.key === "railway") return t.name.startsWith("railway.");
              if (group.key === "payment") return t.name.startsWith("payment.");
              if (group.key === "stellar") return t.name.startsWith("stellar.");
              return false;
            }).length;
            return (
              <Panel key={group.key} className="p-4">
                <div className="text-lg mb-1">{group.icon}</div>
                <div className="text-sm font-medium text-arena-text">{group.label}</div>
                <div className="text-xs text-arena-muted">{count} tools</div>
              </Panel>
            );
          })}
        </div>

        {grouped.map((group) => (
          <Panel key={group.key}>
            <PanelHeader
              title={`${group.icon} ${group.label}`}
              subtitle={group.description}
            />
            <div className="divide-y divide-arena-border">
              {group.tools.map((t) => (
                <div key={t.name} className="flex items-center gap-3 px-5 py-3">
                  <StatusDot tone="blue" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-arena-text font-mono">{t.name}</div>
                    <div className="text-xs text-arena-muted">{t.description}</div>
                  </div>
                  <Badge tone="amber">{t.capability}</Badge>
                  {t.requiresProvider && <Badge tone="violet">{t.requiresProvider}</Badge>}
                </div>
              ))}
            </div>
          </Panel>
        ))}
      </div>
    </div>
  );
}
