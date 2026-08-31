import { PageHeader, Panel } from "@/components/ui";
import { ActivityFeed } from "@/components/activity-feed";

export default function ActivityPage({ searchParams }: { searchParams: Promise<{ mission?: string; agent?: string; tool?: string }> }) {
  const params = {
    mission: undefined as string | undefined,
    agent: undefined as string | undefined,
    tool: undefined as string | undefined,
  };
  // We need to resolve searchParams for the filter display
  return (
    <div className="bg-arena-grid min-h-screen">
      <PageHeader title="Activity" subtitle="Real-time event stream across agents, tools, payments and Stellar." />
      <div className="px-4 md:px-6 py-4 md:py-6 space-y-4">
        {/* Filter info bar */}
        <ActivityFilterBar />
        <Panel>
          <div className="p-2">
            <ActivityFeed mission={params.mission} />
          </div>
        </Panel>
      </div>
    </div>
  );
}

function ActivityFilterBar() {
  return (
    <div className="glass rounded-xl px-4 py-3 flex flex-wrap items-center gap-2 text-xs">
      <span className="text-arena-muted">Filter by:</span>
      <span className="text-arena-muted/50">Mission</span>
      <span className="text-arena-border">·</span>
      <span className="text-arena-muted/50">Agent (coming Prompt 4)</span>
      <span className="text-arena-border">·</span>
      <span className="text-arena-muted/50">Tool (coming Prompt 5)</span>
      <div className="flex-1" />
      <span className="text-arena-muted font-mono">Live polling: 4s</span>
    </div>
  );
}
