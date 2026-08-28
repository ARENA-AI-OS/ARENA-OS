import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Arena OS — Personal AI Operating System",
  description: "One workspace. Every AI. Every tool. One autonomous developer operating system.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-arena-bg">{children}</body>
    </html>
  );
}
