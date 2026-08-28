import { PageHeader } from "@/components/ui";
import { ActivityFeed } from "@/components/activity-feed";

export default function ActivityPage() {
  return (
    <div className="bg-arena-grid min-h-screen">
      <PageHeader title="Activity" subtitle="Real-time event stream across agents, tools, payments and Stellar." />
      <div className="px-6 py-6">
        <div className="glass rounded-xl">
          <ActivityFeed />
        </div>
      </div>
    </div>
  );
}
