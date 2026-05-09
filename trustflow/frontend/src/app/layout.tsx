import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "TrustFlow — Blockchain Escrow for Freelancers",
  description: "Lock funds. Verify work. Release payment. Trustless escrow powered by Polygon.",
  icons: { icon: "/favicon.ico" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
