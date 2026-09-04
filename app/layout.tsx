import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Portal Architecture Starter",
  description: "A minimal multi-tenant institution portal built on Next.js + Supabase.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
