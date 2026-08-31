import { AGENT_REGISTRY } from "@domain/index";
import { Panel, PanelHeader, Badge, PageHeader, StatusDot } from "@/components/ui";

const TONE: Record<string, "violet" | "blue" | "cyan" | "amber" | "green"> = {
  commander: "violet",
  research: "blue",
  code: "blue",
  qa: "cyan",
  deployment: "amber",
  stellar: "green",
};

export default function AgentsPage() {
  const agents = Object.values(AGENT_REGISTRY);
  return (
    <div className="bg-arena-grid min-h-screen">
      <PageHeader title="Agents" subtitle="Specialized AI coworkers. Each receives only the capabilities it needs." />
      <div className="px-6 py-6 grid grid-cols-1 md:grid-cols-2 gap-4">
        {agents.map((a) => (
          <Panel key={a.role}>
            <PanelHeader
              title={a.name}
              right={<StatusDot tone={TONE[a.role]} />}
            />
            <div className="p-4 space-y-3">
              <p className="text-sm text-arena-muted">{a.description}</p>
              <div className="flex flex-wrap gap-1">
                {a.defaultCapabilities.map((c) => (
                  <Badge key={c} tone="blue">{c}</Badge>
                ))}
              </div>
              <div className="text-xs text-arena-muted font-mono">default model role: {a.defaultModelRole}</div>
            </div>
          </Panel>
        ))}
      </div>
    </div>
  );
}
