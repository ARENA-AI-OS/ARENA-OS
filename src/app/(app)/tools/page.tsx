import { TOOL_REGISTRY } from "@tools/registry";
import { Panel, PanelHeader, Badge, PageHeader, StatusDot } from "@/components/ui";

export default function ToolsPage() {
  const tools = Object.values(TOOL_REGISTRY);
  return (
    <div className="bg-arena-grid min-h-screen">
      <PageHeader title="Tools" subtitle="All external actions flow through the Tool Gateway (permission → validate → audit)." />
      <div className="px-6 py-6">
        <Panel>
          <PanelHeader title="Tool Registry" subtitle={`${tools.length} tools`} />
          <div className="divide-y divide-arena-border">
            {tools.map((t) => (
              <div key={t.name} className="flex items-center gap-3 px-5 py-3">
                <StatusDot tone="blue" />
                <div className="flex-1">
                  <div className="text-sm text-arena-text font-mono">{t.name}</div>
                  <div className="text-xs text-arena-muted">{t.description}</div>
                </div>
                <Badge tone="amber">{t.capability}</Badge>
                {t.requiresProvider && <Badge tone="violet">{t.requiresProvider}</Badge>}
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </div>
  );
}
