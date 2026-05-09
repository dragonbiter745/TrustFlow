"use client";
import { useState } from "react";
import { ethers } from "ethers";
import { useWallet } from "@/hooks/useWallet";
import { CONTRACT_ADDRESS, ESCROW_ABI } from "@/lib/contract";
import { saveEscrow, sendEscrowCreatedNotification } from "@/lib/api";
import { Shield, ArrowRight, Loader2, CheckCircle, ExternalLink, AlertCircle } from "lucide-react";
import Link from "next/link";

interface FormData {
  freelancerWallet: string;
  projectTitle: string;
  milestoneDescription: string;
  githubRepo: string;
  amountEth: string;
  clientPhone: string;
  freelancerPhone: string;
}

function CreateEscrowForm() {
  const { address, signer, isCorrectNetwork, connect, switchNetwork } = useWallet();
  const [form, setForm] = useState<FormData>({
    freelancerWallet: "",
    projectTitle: "",
    milestoneDescription: "",
    githubRepo: "",
    amountEth: "",
    clientPhone: "",
    freelancerPhone: "",
  });
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<"form" | "confirm" | "success">("form");
  const [txHash, setTxHash] = useState("");
  const [escrowId, setEscrowId] = useState<number | null>(null);
  const [error, setError] = useState("");

  const update = (k: keyof FormData) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const validate = () => {
    if (!ethers.isAddress(form.freelancerWallet)) return "Invalid freelancer wallet address";
    if (!form.projectTitle.trim()) return "Project title is required";
    if (!form.milestoneDescription.trim()) return "Milestone description is required";
    if (!form.githubRepo.trim()) return "GitHub repo URL is required";
    if (!form.amountEth || parseFloat(form.amountEth) <= 0) return "Amount must be > 0";
    if (form.freelancerWallet.toLowerCase() === address?.toLowerCase()) return "You cannot be your own freelancer";
    return null;
  };

  const handleSubmit = async () => {
    const err = validate();
    if (err) { setError(err); return; }
    if (!signer) { connect(); return; }
    if (!isCorrectNetwork) { switchNetwork(); return; }
    if (!CONTRACT_ADDRESS) { setError("Contract address not configured. Set NEXT_PUBLIC_CONTRACT_ADDRESS."); return; }

    setError("");
    setLoading(true);
    setStep("confirm");

    try {
      const contract = new ethers.Contract(CONTRACT_ADDRESS, ESCROW_ABI, signer);
      const amountWei = ethers.parseEther(form.amountEth);

      // Polygon Amoy requires min 25 gwei gas tip — set 50 gwei to be safe
      const GAS_OVERRIDES = {
        maxPriorityFeePerGas: ethers.parseUnits("50", "gwei"),
        maxFeePerGas: ethers.parseUnits("50", "gwei"),
      };

      const tx = await contract.createEscrow(
        form.freelancerWallet,
        form.projectTitle,
        form.milestoneDescription,
        form.githubRepo,
        { value: amountWei, ...GAS_OVERRIDES }
      );

      const receipt = await tx.wait();
      setTxHash(receipt.hash);

      // Parse escrow ID from event logs
      let newEscrowId = Date.now(); // fallback
      try {
        const iface = new ethers.Interface(ESCROW_ABI);
        for (const log of receipt.logs) {
          try {
            const parsed = iface.parseLog(log);
            if (parsed?.name === "EscrowCreated") {
              newEscrowId = Number(parsed.args.id);
              break;
            }
          } catch {}
        }
      } catch {}

      setEscrowId(newEscrowId);

      // Save to Supabase
      try {
        await saveEscrow({
          escrowId: newEscrowId,
          txHash: receipt.hash,
          clientWallet: address!,
          freelancerWallet: form.freelancerWallet,
          projectTitle: form.projectTitle,
          milestoneDescription: form.milestoneDescription,
          githubRepo: form.githubRepo,
          amountWei: amountWei.toString(),
          amountEth: form.amountEth,
          networkId: "80002",
        });
      } catch (e) {
        console.warn("Supabase save failed:", e);
      }

      // Send WhatsApp notifications
      try {
        await sendEscrowCreatedNotification({
          escrowId: newEscrowId,
          projectTitle: form.projectTitle,
          amountEth: form.amountEth,
          clientPhone: form.clientPhone || undefined,
          freelancerPhone: form.freelancerPhone || undefined,
        });
      } catch (e) {
        console.warn("WhatsApp notification failed:", e);
      }

      setStep("success");
    } catch (e: any) {
      setError(e.reason || e.message || "Transaction failed");
      setStep("form");
    }
    setLoading(false);
  };

  if (step === "success") {
    return (
      <div className="text-center py-12 animate-fade-in">
        <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle className="w-8 h-8 text-green-500" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Escrow Created!</h2>
        <p className="text-gray-500 mb-8">
          Funds are locked on-chain. The freelancer has been notified.
        </p>
        <div className="bg-gray-50 rounded-xl p-4 mb-8 text-left max-w-md mx-auto">
          <div className="text-xs text-gray-500 mb-1">Transaction Hash</div>
          <a
            href={`https://amoy.polygonscan.com/tx/${txHash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="font-mono text-xs text-brand-600 hover:underline flex items-center gap-1 break-all"
          >
            {txHash} <ExternalLink className="w-3 h-3 flex-shrink-0" />
          </a>
          {escrowId && (
            <div className="mt-3">
              <div className="text-xs text-gray-500 mb-1">Escrow ID</div>
              <div className="font-mono text-sm font-semibold">#{escrowId}</div>
            </div>
          )}
        </div>
        <div className="flex gap-3 justify-center">
          <Link href="/dashboard" className="btn-primary">
            View Dashboard <ArrowRight className="w-4 h-4" />
          </Link>
          <button onClick={() => { setStep("form"); setForm({ freelancerWallet: "", projectTitle: "", milestoneDescription: "", githubRepo: "", amountEth: "", clientPhone: "", freelancerPhone: "" }); }}
            className="btn-secondary">
            Create Another
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      {step === "confirm" && (
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-xl text-sm text-blue-800 flex items-center gap-3">
          <Loader2 className="w-4 h-4 animate-spin flex-shrink-0" />
          Confirm the transaction in MetaMask. Waiting for blockchain confirmation...
        </div>
      )}

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-800 flex items-center gap-3">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left column */}
        <div className="space-y-5">
          <div>
            <label className="label">Project Title *</label>
            <input className="input" placeholder="e.g. Build Escrow Dashboard" value={form.projectTitle} onChange={update("projectTitle")} />
          </div>
          <div>
            <label className="label">Freelancer Wallet Address *</label>
            <input className="input font-mono text-sm" placeholder="0x..." value={form.freelancerWallet} onChange={update("freelancerWallet")} />
          </div>
          <div>
            <label className="label">Amount (MATIC) *</label>
            <div className="relative">
              <input className="input pr-16" type="number" min="0" step="0.01" placeholder="0.00" value={form.amountEth} onChange={update("amountEth")} />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-semibold text-gray-400">MATIC</span>
            </div>
            {form.amountEth && (
              <p className="text-xs text-gray-400 mt-1">≈ {parseFloat(form.amountEth || "0").toFixed(4)} MATIC will be locked</p>
            )}
          </div>
          <div>
            <label className="label">GitHub Repository URL *</label>
            <input className="input" placeholder="https://github.com/user/repo" value={form.githubRepo} onChange={update("githubRepo")} />
          </div>
        </div>

        {/* Right column */}
        <div className="space-y-5">
          <div>
            <label className="label">Milestone Description *</label>
            <textarea className="input resize-none" rows={4} placeholder="Describe what the freelancer needs to deliver..." value={form.milestoneDescription} onChange={update("milestoneDescription")} />
          </div>
          <div className="bg-gray-50 rounded-xl p-4 space-y-4">
            <p className="text-xs font-semibold text-gray-600 uppercase tracking-wider">WhatsApp Notifications (optional)</p>
            <div>
              <label className="label">Your Phone (with country code)</label>
              <input className="input text-sm" placeholder="+1234567890" value={form.clientPhone} onChange={update("clientPhone")} />
            </div>
            <div>
              <label className="label">Freelancer's Phone</label>
              <input className="input text-sm" placeholder="+1234567890" value={form.freelancerPhone} onChange={update("freelancerPhone")} />
            </div>
          </div>
        </div>
      </div>

      {/* Summary card */}
      {form.projectTitle && form.amountEth && (
        <div className="mt-6 p-4 bg-orange-50 border border-orange-100 rounded-xl text-sm">
          <div className="font-semibold text-gray-800 mb-2">Escrow Summary</div>
          <div className="grid grid-cols-2 gap-2 text-gray-600">
            <span>Project:</span><span className="font-medium text-gray-900">{form.projectTitle}</span>
            <span>Lock Amount:</span><span className="font-medium text-gray-900">{form.amountEth} MATIC</span>
            <span>Platform fee:</span><span className="font-medium text-gray-900">1% ({(parseFloat(form.amountEth || "0") * 0.01).toFixed(4)} MATIC)</span>
            <span>Freelancer receives:</span><span className="font-medium text-green-700">{(parseFloat(form.amountEth || "0") * 0.99).toFixed(4)} MATIC</span>
          </div>
        </div>
      )}

      <div className="mt-8 flex items-center justify-between">
        <p className="text-xs text-gray-400">Funds will be locked in a smart contract on Polygon Amoy</p>
        {!address ? (
          <button onClick={connect} className="btn-primary">Connect Wallet</button>
        ) : !isCorrectNetwork ? (
          <button onClick={switchNetwork} className="btn-primary bg-amber-500 hover:bg-amber-600">Switch to Amoy</button>
        ) : (
          <button onClick={handleSubmit} disabled={loading} className="btn-primary disabled:opacity-60">
            {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Processing...</> : <>Lock Funds <Shield className="w-4 h-4" /></>}
          </button>
        )}
      </div>
    </div>
  );
}

export default function CreateEscrowPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Create Escrow</h1>
        <p className="text-gray-500">Lock funds on-chain. Release when work is verified.</p>
      </div>
      <div className="card p-8">
        <CreateEscrowForm />
      </div>
    </div>
  );
}
