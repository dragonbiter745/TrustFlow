"use client";
import { useWallet } from "@/hooks/useWallet";
import { Shield, Wallet, ChevronDown, AlertCircle, LogOut } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

export default function Navbar() {
  const { address, connect, disconnect, loading, isCorrectNetwork, switchNetwork } = useWallet();
  const [menuOpen, setMenuOpen] = useState(false);

  const shortAddr = address
    ? `${address.substring(0, 6)}...${address.substring(38)}`
    : null;

  return (
    <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-gray-100">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="w-8 h-8 bg-brand-500 rounded-lg flex items-center justify-center shadow-sm group-hover:shadow-md transition-shadow">
            <Shield className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-gray-900 text-lg tracking-tight">
            Trust<span className="text-brand-500">Flow</span>
          </span>
        </Link>

        {/* Nav Links */}
        <div className="hidden md:flex items-center gap-6 text-sm font-medium text-gray-600">
          <Link href="/dashboard" className="hover:text-gray-900 transition-colors">Dashboard</Link>
          <Link href="/escrow/create" className="hover:text-gray-900 transition-colors">Create Escrow</Link>
          <a href="#how-it-works" className="hover:text-gray-900 transition-colors">How It Works</a>
        </div>

        {/* Wallet */}
        <div className="flex items-center gap-3">
          {address && !isCorrectNetwork && (
            <button
              onClick={switchNetwork}
              className="flex items-center gap-1.5 text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-lg hover:bg-amber-100 transition-colors"
            >
              <AlertCircle className="w-3.5 h-3.5" />
              Switch to Amoy
            </button>
          )}

          {!address ? (
            <button onClick={connect} disabled={loading} className="btn-primary text-sm">
              <Wallet className="w-4 h-4" />
              {loading ? "Connecting..." : "Connect Wallet"}
            </button>
          ) : (
            <div className="relative">
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm font-medium hover:border-gray-300 transition-colors"
              >
                <div className="w-2 h-2 rounded-full bg-green-400" />
                <span className="font-mono text-xs text-gray-700">{shortAddr}</span>
                <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
              </button>
              {menuOpen && (
                <div className="absolute right-0 top-12 bg-white border border-gray-100 rounded-xl shadow-lg py-1 w-48">
                  <Link
                    href="/dashboard"
                    className="flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50"
                    onClick={() => setMenuOpen(false)}
                  >
                    Dashboard
                  </Link>
                  <hr className="my-1 border-gray-100" />
                  <button
                    onClick={() => { disconnect(); setMenuOpen(false); }}
                    className="flex items-center gap-2 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 w-full"
                  >
                    <LogOut className="w-4 h-4" />
                    Disconnect
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
