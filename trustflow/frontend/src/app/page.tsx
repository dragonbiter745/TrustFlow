"use client";
import { WalletProvider, useWallet } from "@/hooks/useWallet";
import Navbar from "@/components/Navbar";
import Link from "next/link";
import { Shield, GitBranch, Zap, Lock, CheckCircle, ArrowRight, Globe } from "lucide-react";

function HeroSection() {
  const { address, connect, loading } = useWallet();

  return (
    <section className="relative overflow-hidden pt-20 pb-24 px-4">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-orange-50 via-white to-white pointer-events-none" />
      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-gradient-radial from-orange-100/40 to-transparent rounded-full translate-x-1/3 -translate-y-1/4 pointer-events-none" />

      <div className="relative max-w-4xl mx-auto text-center">
        {/* Pill badge */}
        <div className="inline-flex items-center gap-2 bg-orange-50 border border-orange-200 text-orange-700 text-xs font-semibold px-4 py-1.5 rounded-full mb-8">
          <div className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse" />
          Live on Polygon Amoy Testnet
        </div>

        <h1 className="text-5xl md:text-6xl font-bold text-gray-900 leading-tight mb-6 tracking-tight">
          Escrow powered by
          <br />
          <span className="text-brand-500">blockchain proof</span>
        </h1>

        <p className="text-xl text-gray-500 max-w-2xl mx-auto mb-10 leading-relaxed">
          TrustFlow locks client funds in a smart contract. Freelancers submit GitHub commits as proof-of-work. Clients release funds with one click. No middlemen.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          {address ? (
            <>
              <Link href="/escrow/create" className="btn-primary text-base px-7 py-3.5">
                Create Escrow <ArrowRight className="w-5 h-5" />
              </Link>
              <Link href="/dashboard" className="btn-secondary text-base px-7 py-3.5">
                View Dashboard
              </Link>
            </>
          ) : (
            <button onClick={connect} disabled={loading} className="btn-primary text-base px-8 py-3.5">
              {loading ? "Connecting..." : "Connect Wallet to Start"}
              <ArrowRight className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Stats */}
        <div className="flex items-center justify-center gap-8 mt-14 text-sm text-gray-500">
          {[["Trustless", "No intermediaries"], ["On-chain", "Polygon Amoy"], ["GitHub Verified", "Proof-of-work"]].map(([title, sub]) => (
            <div key={title} className="text-center">
              <div className="font-semibold text-gray-900">{title}</div>
              <div className="text-xs mt-0.5">{sub}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function HowItWorks() {
  const steps = [
    {
      icon: Lock,
      title: "Client locks funds",
      desc: "Client creates an escrow by depositing MATIC into the smart contract. Funds are locked until work is approved.",
      color: "bg-blue-50 text-blue-600",
    },
    {
      icon: GitBranch,
      title: "Freelancer submits proof",
      desc: "Freelancer submits commit hash, PR link, and GitHub repo. Our system verifies the work automatically.",
      color: "bg-orange-50 text-orange-600",
    },
    {
      icon: Zap,
      title: "AI summarizes work",
      desc: "Claude AI analyzes the GitHub activity and generates a concise proof-of-work summary for the client.",
      color: "bg-purple-50 text-purple-600",
    },
    {
      icon: CheckCircle,
      title: "Client releases payment",
      desc: "Client reviews the work and approves. Smart contract sends funds directly to the freelancer's wallet.",
      color: "bg-green-50 text-green-600",
    },
  ];

  return (
    <section id="how-it-works" className="py-20 px-4 bg-white border-t border-gray-100">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-14">
          <h2 className="text-3xl font-bold text-gray-900 mb-3">How TrustFlow works</h2>
          <p className="text-gray-500">Four simple steps from project start to payment</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {steps.map((step, i) => (
            <div key={i} className="card p-6 relative">
              <div className="absolute top-4 right-4 text-xs font-bold text-gray-200 text-right">{String(i + 1).padStart(2, "0")}</div>
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 ${step.color}`}>
                <step.icon className="w-5 h-5" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">{step.title}</h3>
              <p className="text-sm text-gray-500 leading-relaxed">{step.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Features() {
  const features = [
    { icon: Shield, title: "Non-custodial escrow", desc: "Funds go directly on-chain. TrustFlow never holds your money." },
    { icon: GitBranch, title: "GitHub as proof-of-work", desc: "Commit hashes and PRs are verified via GitHub API in real time." },
    { icon: Globe, title: "Polygon network", desc: "Fast, cheap transactions on Polygon Amoy with MetaMask." },
    { icon: Zap, title: "AI work summaries", desc: "Claude AI turns GitHub activity into readable work summaries." },
  ];

  return (
    <section className="py-20 px-4 bg-gray-50 border-t border-gray-100">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-14">
          <h2 className="text-3xl font-bold text-gray-900 mb-3">Built different</h2>
          <p className="text-gray-500">Real blockchain. Real verification. Real payments.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {features.map((f) => (
            <div key={f.title} className="card p-6 flex gap-4">
              <div className="w-10 h-10 bg-brand-50 text-brand-600 rounded-xl flex items-center justify-center flex-shrink-0">
                <f.icon className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-1">{f.title}</h3>
                <p className="text-sm text-gray-500">{f.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default function Home() {
  return (
    <WalletProvider>
      <div className="min-h-screen bg-white">
        <Navbar />
        <HeroSection />
        <HowItWorks />
        <Features />
        <footer className="py-8 text-center text-sm text-gray-400 border-t border-gray-100">
          TrustFlow — Blockchain Escrow for Freelancers · Built on Polygon Amoy
        </footer>
      </div>
    </WalletProvider>
  );
}
