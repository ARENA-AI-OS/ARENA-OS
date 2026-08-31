import { Nav } from "@/components/nav";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-arena-bg">
      <Nav />
      <main className="md:ml-64 min-h-screen">{children}</main>
    </div>
  );
}
