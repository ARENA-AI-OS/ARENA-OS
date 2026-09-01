import type { Metadata } from "next";
import "./globals.css";
import { IntroScreen } from "@/components/intro-screen";

export const metadata: Metadata = {
  title: "Arena OS — Personal AI Operating System",
  description: "One workspace. Every AI. Every tool. One autonomous developer operating system.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-arena-bg">
        <video
          autoPlay
          loop
          muted
          playsInline
          className="fixed inset-0 w-full h-full object-cover z-[-1] opacity-[0.15] pointer-events-none"
          src="/background.mp4"
        />
        <div className="fixed inset-0 z-[-1] pointer-events-none bg-gradient-to-b from-arena-bg/70 via-arena-bg/50 to-arena-bg/80" />
        <IntroScreen />
        {children}
      </body>
    </html>
  );
}
