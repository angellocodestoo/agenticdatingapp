import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import AppNav from "@/components/AppNav";

const geist = Geist({ subsets: ["latin"], variable: "--font-geist" });

export const metadata: Metadata = {
  metadataBase: new URL(process.env.APP_PUBLIC_ORIGIN ?? "http://localhost:3000"),
  title: "Red String - Fate, handled.",
  description:
    "An invisible thread already ties you to your person. Your agent follows it, learns who you are, talks to other agents, and only surfaces dates worth having.",
  manifest: "/manifest.webmanifest",
  applicationName: "Red String",
  appleWebApp: {
    capable: true,
    title: "Red String",
    statusBarStyle: "default",
  },
  formatDetection: {
    telephone: false,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${geist.variable} h-full`}>
      <body className="h-full bg-stone-50 text-stone-900 antialiased font-[var(--font-geist)]">
        <AppNav />
        {children}
      </body>
    </html>
  );
}
