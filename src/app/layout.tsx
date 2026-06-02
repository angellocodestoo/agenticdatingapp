import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";

const geist = Geist({ subsets: ["latin"], variable: "--font-geist" });

export const metadata: Metadata = {
  title: "Soulmate — Agentic Dating",
  description: "Let your agent find your person.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${geist.variable} h-full`}>
      <body className="h-full bg-stone-50 text-stone-900 antialiased font-[var(--font-geist)]">
        {children}
      </body>
    </html>
  );
}
