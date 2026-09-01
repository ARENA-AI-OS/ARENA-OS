import { Nav } from "@/components/nav";
import { TopBar } from "@/components/top-bar";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-arena-bg">
      <Nav />
      <div className="md:ml-[240px] min-h-screen flex flex-col">
        <TopBar />
        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
}
