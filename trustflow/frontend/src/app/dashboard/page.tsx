"use client";
import { useState, useEffect } from "react";
import { ethers } from "ethers";
import { WalletProvider, useWallet } from "@/hooks/useWallet";
import { WalletProvider, useWallet } from "@/hooks/useWallet";
import StatusBadge from "@/components/StatusBadge";
import { CONTRACT_ADDRESS, ESCROW_ABI, STATUS_MAP } from "@/lib/contract";
import { getEscrowsByWallet } from "@/lib/api";
import { Plus, Wallet, Loader2, Shield, TrendingUp, Clock, CheckCircle, ArrowRight } from "lucide-react";
import Link from "next/link";

interface EscrowSummary {
  id: number;
  projectTitle: string;
  amount: string;
  status: string;
  client: string;
  freelancer: string;
  createdAt: number;
  role: "client" | "freelancer";
}

function Dashboard() {
  const { address, signer, connect } = useWallet();
  const [escrows, setEscrows] = useState<EscrowSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [source, setSource] = useState<"chain" | "db" | null>(null);
  const [filter, setFilter] = useState<"all" | "client" | "freelancer">("all");

  useEffect(() => {
    if (address) loadEscrows();
  }, [address, signer]);

  const loadEscrows = async () => {
    setLoading(true);
    try {
      // Try chain-first approach
      const provider = signer?.provider || new ethers.BrowserProvider((window as any).ethereum);
      const contract = new ethers.Contract(CONTRACT_ADDRESS, ESCROW_ABI, provider);

      const [clientIds, freelancerIds] = await Promise.all([
        contract.getClientEscrows(address),
        contract.getFreelancerEscrows(address),
      ]);

      const allIds = [
        ...clientIds.map((id: bigint) => ({ id, role: "client" as const })),
        ...freelancerIds.map((id: bigint) => ({ id, role: "freelancer" as const })),
      ];

      const details = await Promise.all(
        allIds.map(async ({ id, role }) => {
          const e = await contract.getEscrow(id);
          return {
            id: Number(e.id),
            projectTitle: e.projectTitle,
            amount: ethers.formatEther(e.amount),
            status: STATUS_MAP[e.status] || "FUNDED",
            client: e.client,
            freelancer: e.freelancer,
            createdAt: Number(e.createdAt),
            role,
          };
        })
      );

      setEscrows(details.sort((a, b) => b.createdAt - a.createdAt));
      setSource("chain");
    } catch {
      // Fallback to DB
      try {
        const dbEscrows = await getEscrowsByWallet(address!);
        setEscrows(
          dbEscrows.map((e: any) => ({
            id: e.escrow_id,
            projectTitle: e.project_title,
            amount: e.amount_eth,
            status: e.status,
            client: e.client_wallet,
            freelancer: e.freelancer_wallet,
            createdAt: new Date(e.created_at).getTime() / 1000,
            role: e.client_wallet.toLowerCase() === address?.toLowerCase() ? "client" : "freelancer",
          }))
        );
        setSource("db");
      } catch {}
    }
    setLoading(false);
  };

  if (!address) {
    return (
      <div className="text-center py-24">
        <div className="w-16 h-16 bg-brand-50 rounded-2xl flex items-center justify-center mx-auto mb-6">
          <Wallet className="w-8 h-8 text-brand-500" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-3">Connect your wallet</h2>
        <p className="text-gray-500 mb-8">Connect MetaMask to view your escrow contracts</p>
        <button onClick={connect} className="btn-primary mx-auto">Connect MetaMask</button>
      </div>
    );
  }

  const stats = {
    total: escrows.length,
    active: escrows.filter(e => ["FUNDED", "WORK_SUBMITTED"].includes(e.status)).length,
    completed: escrows.filter(e => e.status === "RELEASED").length,
    totalValue: escrows.reduce((sum, e) => sum + parseFloat(e.amount || "0"), 0),
  };

  const filteredEscrows = escrows.filter(e => filter === "all" || e.role === filter);

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-1">Dashboard</h1>
          <p className="text-sm text-gray-500 font-mono">{address?.substring(0, 8)}...{address?.substring(36)}</p>
        </div>
        <Link href="/escrow/create" className="btn-primary">
          <Plus className="w-4 h-4" /> New Escrow
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          { label: "Total Escrows", value: stats.total, icon: Shield, color: "text-blue-600 bg-blue-50" },
          { label: "Active", value: stats.active, icon: Clock, color: "text-amber-600 bg-amber-50" },
          { label: "Completed", value: stats.completed, icon: CheckCircle, color: "text-green-600 bg-green-50" },
          { label: "Total MATIC", value: stats.totalValue.toFixed(3), icon: TrendingUp, color: "text-brand-600 bg-brand-50" },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="card p-5">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-3 ${color}`}>
              <Icon className="w-5 h-5" />
            </div>
            <div className="text-2xl font-bold text-gray-900">{value}</div>
            <div className="text-xs text-gray-500 mt-0.5">{label}</div>
          </div>
        ))}
      </div>

      {/* Filter Tabs */}
      <div className="flex border-b border-gray-200 mb-8">
        {[
          { id: "all", label: "All Projects" },
          { id: "client", label: "I'm a Client" },
          { id: "freelancer", label: "I'm a Freelancer" },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setFilter(tab.id as any)}
            className={`px-6 py-3 text-sm font-medium transition-all border-b-2 ${
              filter === tab.id 
                ? "border-brand-500 text-brand-600" 
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Escrow list */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-7 h-7 animate-spin text-brand-500" />
        </div>
      ) : escrows.length === 0 ? (
        <div className="card p-12 text-center">
          <div className="w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Shield className="w-7 h-7 text-gray-400" />
          </div>
          <h3 className="font-semibold text-gray-900 mb-2">No escrows yet</h3>
          <p className="text-sm text-gray-500 mb-6">Create your first escrow to get started</p>
          <Link href="/escrow/create" className="btn-primary inline-flex mx-auto">
            <Plus className="w-4 h-4" /> Create Escrow
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {source === "db" && (
            <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 px-3 py-2 rounded-lg">
              Showing data from database. Connect to Polygon Amoy for live chain data.
            </p>
          )}
          {filteredEscrows.map((e) => (
            <Link
              key={e.id}
              href={`/escrow/${e.id}`}
              className="card p-5 flex items-center justify-between hover:border-brand-200 hover:shadow-md transition-all group"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-brand-50 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Shield className="w-5 h-5 text-brand-500" />
                </div>
                <div>
                  <div className="font-semibold text-gray-900 group-hover:text-brand-600 transition-colors">
                    {e.projectTitle}
                  </div>
                  <div className="text-sm text-gray-500 mt-0.5">
                    #{e.id} · {e.role === "client" ? "You're the client" : "You're the freelancer"}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right hidden sm:block">
                  <div className="font-semibold text-gray-900">{parseFloat(e.amount).toFixed(4)} MATIC</div>
                  <div className="text-xs text-gray-400">{new Date(e.createdAt * 1000).toLocaleDateString()}</div>
                </div>
                <StatusBadge status={e.status} />
                <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-brand-400 transition-colors" />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

export default function DashboardPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      <Dashboard />
    </div>
  );
}
