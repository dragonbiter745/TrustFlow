import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "TrustFlow — Blockchain Escrow for Freelancers",
  description: "Lock funds. Verify work. Release payment. Trustless escrow powered by Polygon.",
  icons: { icon: "/favicon.ico" },
};

import Sidebar from "@/components/Sidebar";
import { WalletProvider } from "@/hooks/useWallet";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-gray-50 text-gray-900 min-h-screen">
        <WalletProvider>
          <div className="flex min-h-screen">
            <Sidebar />
            <main className="flex-1 ml-64 min-h-screen overflow-y-auto">
              {children}
            </main>
          </div>
        </WalletProvider>
      </body>
    </html>
  );
}
