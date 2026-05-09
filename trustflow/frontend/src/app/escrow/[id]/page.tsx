"use client";
import { useState, useEffect } from "react";
import { ethers } from "ethers";
import { WalletProvider, useWallet } from "@/hooks/useWallet";
import Navbar from "@/components/Navbar";
import StatusBadge from "@/components/StatusBadge";
import { CONTRACT_ADDRESS, ESCROW_ABI, STATUS_MAP } from "@/lib/contract";
import {
  verifyGitHub, submitWorkToBackend, updateEscrowStatus,
  sendWorkSubmittedNotification, sendPaymentReleasedNotification
} from "@/lib/api";
import {
  GitBranch, CheckCircle, AlertTriangle, Loader2, ExternalLink,
  Zap, ArrowLeft, Clock, User, Code, Shield
} from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";

interface OnChainEscrow {
  id: bigint; client: string; freelancer: string; amount: bigint;
  projectTitle: string; milestoneDescription: string; githubRepo: string;
  status: number; workProof: string; createdAt: bigint; updatedAt: bigint;
}

function EscrowDetail() {
  const { id } = useParams<{ id: string }>();
  const { address, signer, isCorrectNetwork } = useWallet();
  const [escrow, setEscrow] = useState<OnChainEscrow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [txLoading, setTxLoading] = useState(false);
  const [txHash, setTxHash] = useState("");

  // Work submission form
  const [commitHash, setCommitHash] = useState("");
  const [prLink, setPrLink] = useState("");
  const [repoLink, setRepoLink] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [verification, setVerification] = useState<any>(null);
  const [verifyError, setVerifyError] = useState("");

  useEffect(() => {
    if (id) loadEscrow();
  }, [id, signer]);

  const loadEscrow = async () => {
    if (!signer && !(window as any).ethereum) { setLoading(false); return; }
    try {
      const provider = signer
        ? signer.provider
        : new ethers.BrowserProvider((window as any).ethereum);
      const contract = new ethers.Contract(CONTRACT_ADDRESS, ESCROW_ABI, provider);
      const data = await contract.getEscrow(BigInt(id));
      setEscrow(data);
    } catch (e: any) {
      setError("Could not load escrow from chain: " + (e.message || ""));
    }
    setLoading(false);
  };

  const handleVerifyAndSubmit = async () => {
    if (!repoLink) { setVerifyError("Repository link required"); return; }
    setVerifying(true);
    setVerifyError("");
    try {
      const result = await verifyGitHub({ commitHash, prLink, repoLink });
      setVerification(result.verification);
    } catch (e: any) {
      setVerifyError(e.response?.data?.error || "Verification failed");
    }
    setVerifying(false);
  };

  const handleSubmitWork = async () => {
    if (!signer || !escrow) return;
    setTxLoading(true);
    setError("");
    try {
      const contract = new ethers.Contract(CONTRACT_ADDRESS, ESCROW_ABI, signer);
      const workProof = JSON.stringify({ commitHash, prLink, repoLink, aiSummary: verification?.aiSummary });
      const tx = await contract.submitWork(BigInt(id), workProof);
      const receipt = await tx.wait();
      setTxHash(receipt.hash);

      await submitWorkToBackend(Number(id), {
        commitHash, prLink, repoLink,
        freelancerWallet: address!,
        verification: verification || {},
        txHash: receipt.hash,
      }).catch(console.warn);

      await sendWorkSubmittedNotification({
        escrowId: Number(id),
        projectTitle: escrow.projectTitle,
        aiSummary: verification?.aiSummary || "Work submitted",
      }).catch(console.warn);

      await loadEscrow();
    } catch (e: any) {
      setError(e.reason || e.message || "Submit work failed");
    }
    setTxLoading(false);
  };

  const handleApproveRelease = async () => {
    if (!signer || !escrow) return;
    setTxLoading(true);
    setError("");
    try {
      const contract = new ethers.Contract(CONTRACT_ADDRESS, ESCROW_ABI, signer);
      const tx = await contract.approveRelease(BigInt(id));
      const receipt = await tx.wait();
      setTxHash(receipt.hash);

      await updateEscrowStatus(Number(id), "RELEASED", receipt.hash).catch(console.warn);
      await sendPaymentReleasedNotification({
        escrowId: Number(id),
        projectTitle: escrow.projectTitle,
        amountEth: ethers.formatEther(escrow.amount),
        txHash: receipt.hash,
      }).catch(console.warn);

      await loadEscrow();
    } catch (e: any) {
      setError(e.reason || e.message || "Release failed");
    }
    setTxLoading(false);
  };

  const handleRaiseDispute = async () => {
    if (!signer || !escrow) return;
    if (!confirm("Are you sure you want to raise a dispute? This will flag the escrow for review.")) return;
    setTxLoading(true);
    try {
      const contract = new ethers.Contract(CONTRACT_ADDRESS, ESCROW_ABI, signer);
      const tx = await contract.raiseDispute(BigInt(id));
      await tx.wait();
      await updateEscrowStatus(Number(id), "DISPUTED").catch(console.warn);
      await loadEscrow();
    } catch (e: any) {
      setError(e.reason || e.message || "Dispute failed");
    }
    setTxLoading(false);
  };

  if (loading) return (
    <div className="flex items-center justify-center py-24">
      <Loader2 className="w-8 h-8 animate-spin text-brand-500" />
    </div>
  );

  if (!escrow || escrow.id === 0n) return (
    <div className="text-center py-24">
      <p className="text-gray-500 mb-4">Escrow not found or contract not configured.</p>
      <Link href="/dashboard" className="btn-secondary">← Back to Dashboard</Link>
    </div>
  );

  const statusName = STATUS_MAP[escrow.status] || "FUNDED";
  const isClient = address?.toLowerCase() === escrow.client.toLowerCase();
  const isFreelancer = address?.toLowerCase() === escrow.freelancer.toLowerCase();
  const amountEth = ethers.formatEther(escrow.amount);
  let parsedWorkProof: any = {};
  try { parsedWorkProof = JSON.parse(escrow.workProof); } catch {}

  return (
    <div className="animate-fade-in">
      <Link href="/dashboard" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-6">
        <ArrowLeft className="w-4 h-4" /> Back to Dashboard
      </Link>

      {/* Header */}
      <div className="card p-6 mb-6">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <div className="text-xs font-mono text-gray-400 mb-1">Escrow #{id}</div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">{escrow.projectTitle}</h1>
            <StatusBadge status={statusName} />
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold text-gray-900">{parseFloat(amountEth).toFixed(4)}</div>
            <div className="text-sm text-gray-500">MATIC locked</div>
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-800 flex gap-2">
          <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" /> {error}
        </div>
      )}

      {txHash && (
        <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-xl text-sm text-green-800">
          Transaction confirmed:{" "}
          <a href={`https://amoy.polygonscan.com/tx/${txHash}`} target="_blank" rel="noreferrer" className="underline font-mono text-xs">
            {txHash.substring(0, 30)}...
          </a>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Milestone */}
          <div className="card p-6">
            <h2 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <Shield className="w-4 h-4 text-brand-500" /> Milestone
            </h2>
            <p className="text-gray-600 text-sm leading-relaxed">{escrow.milestoneDescription}</p>
            <div className="mt-4 pt-4 border-t border-gray-100">
              <a href={escrow.githubRepo} target="_blank" rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-sm text-brand-600 hover:underline">
                <GitBranch className="w-4 h-4" /> {escrow.githubRepo}
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>

          {/* Work proof (if submitted) */}
          {escrow.workProof && (
            <div className="card p-6">
              <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Code className="w-4 h-4 text-purple-500" /> Work Submission
              </h2>
              {parsedWorkProof.aiSummary && (
                <div className="bg-purple-50 border border-purple-100 rounded-xl p-4 mb-4">
                  <div className="text-xs font-semibold text-purple-600 mb-1 flex items-center gap-1">
                    <Zap className="w-3 h-3" /> AI Summary
                  </div>
                  <p className="text-sm text-purple-900">{parsedWorkProof.aiSummary}</p>
                </div>
              )}
              <div className="space-y-3 text-sm">
                {parsedWorkProof.commitHash && (
                  <div>
                    <span className="text-gray-500">Commit: </span>
                    <code className="font-mono bg-gray-100 px-2 py-0.5 rounded text-xs">{parsedWorkProof.commitHash}</code>
                  </div>
                )}
                {parsedWorkProof.prLink && (
                  <div>
                    <span className="text-gray-500">PR: </span>
                    <a href={parsedWorkProof.prLink} target="_blank" rel="noreferrer" className="text-brand-600 hover:underline text-xs">
                      {parsedWorkProof.prLink}
                    </a>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Submit work form (freelancer, status FUNDED) */}
          {isFreelancer && escrow.status === 0 && (
            <div className="card p-6">
              <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <GitBranch className="w-4 h-4 text-brand-500" /> Submit Work
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="label">Repository Link *</label>
                  <input className="input text-sm" placeholder="https://github.com/user/repo" value={repoLink} onChange={(e) => setRepoLink(e.target.value)} />
                </div>
                <div>
                  <label className="label">Commit Hash (optional)</label>
                  <input className="input font-mono text-sm" placeholder="abc1234..." value={commitHash} onChange={(e) => setCommitHash(e.target.value)} />
                </div>
                <div>
                  <label className="label">Pull Request Link (optional)</label>
                  <input className="input text-sm" placeholder="https://github.com/user/repo/pull/1" value={prLink} onChange={(e) => setPrLink(e.target.value)} />
                </div>

                {verifyError && <p className="text-sm text-red-600">{verifyError}</p>}

                {verification && (
                  <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-sm">
                    <div className="font-semibold text-green-800 mb-2 flex items-center gap-1">
                      <CheckCircle className="w-4 h-4" /> GitHub Verified
                    </div>
                    {verification.commitVerified && <p className="text-green-700">✓ Commit verified: {verification.commitData?.message}</p>}
                    {verification.prVerified && <p className="text-green-700">✓ PR verified: {verification.prData?.title}</p>}
                    {verification.aiSummary && (
                      <div className="mt-3 pt-3 border-t border-green-200">
                        <div className="text-xs font-semibold text-green-700 mb-1">AI Summary:</div>
                        <p className="text-green-800">{verification.aiSummary}</p>
                      </div>
                    )}
                  </div>
                )}

                <div className="flex gap-3">
                  {!verification ? (
                    <button onClick={handleVerifyAndSubmit} disabled={verifying} className="btn-secondary">
                      {verifying ? <><Loader2 className="w-4 h-4 animate-spin" /> Verifying...</> : <><GitBranch className="w-4 h-4" /> Verify on GitHub</>}
                    </button>
                  ) : (
                    <button onClick={handleSubmitWork} disabled={txLoading} className="btn-primary">
                      {txLoading ? <><Loader2 className="w-4 h-4 animate-spin" /> Submitting...</> : <>Submit Work On-Chain</>}
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Client actions */}
          {isClient && (escrow.status === 0 || escrow.status === 1) && (
            <div className="card p-6">
              <h2 className="font-semibold text-gray-900 mb-4">Actions</h2>
              <div className="flex gap-3 flex-wrap">
                <button onClick={handleApproveRelease} disabled={txLoading} className="btn-primary">
                  {txLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                  Approve & Release Payment
                </button>
                <button onClick={handleRaiseDispute} disabled={txLoading} className="btn-secondary text-red-600 border-red-200 hover:border-red-400">
                  <AlertTriangle className="w-4 h-4" /> Raise Dispute
                </button>
              </div>
              {escrow.status === 0 && <p className="text-xs text-gray-400 mt-3">Work not yet submitted. You can release early or wait.</p>}
            </div>
          )}

          {/* Freelancer: dispute option */}
          {isFreelancer && (escrow.status === 0 || escrow.status === 1) && (
            <div className="card p-4">
              <button onClick={handleRaiseDispute} disabled={txLoading} className="btn-secondary text-red-600 text-sm">
                <AlertTriangle className="w-4 h-4" /> Raise Dispute
              </button>
            </div>
          )}
        </div>

        {/* Right: Parties & timeline */}
        <div className="space-y-6">
          <div className="card p-5">
            <h3 className="font-semibold text-gray-900 mb-4">Parties</h3>
            <div className="space-y-3">
              <div>
                <div className="text-xs text-gray-500 mb-1 flex items-center gap-1"><User className="w-3 h-3" /> Client</div>
                <code className="text-xs font-mono text-gray-700 break-all">{escrow.client}</code>
                {isClient && <span className="ml-2 badge badge-funded text-xs">You</span>}
              </div>
              <div>
                <div className="text-xs text-gray-500 mb-1 flex items-center gap-1"><User className="w-3 h-3" /> Freelancer</div>
                <code className="text-xs font-mono text-gray-700 break-all">{escrow.freelancer}</code>
                {isFreelancer && <span className="ml-2 badge badge-funded text-xs">You</span>}
              </div>
            </div>
          </div>

          <div className="card p-5">
            <h3 className="font-semibold text-gray-900 mb-4">Timeline</h3>
            <div className="space-y-3">
              <div className="flex items-center gap-3 text-sm">
                <div className="w-2 h-2 rounded-full bg-blue-400 flex-shrink-0" />
                <div>
                  <div className="font-medium text-gray-700">Escrow Created</div>
                  <div className="text-xs text-gray-400 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {new Date(Number(escrow.createdAt) * 1000).toLocaleDateString()}
                  </div>
                </div>
              </div>
              {escrow.status >= 1 && (
                <div className="flex items-center gap-3 text-sm">
                  <div className="w-2 h-2 rounded-full bg-yellow-400 flex-shrink-0" />
                  <div className="font-medium text-gray-700">Work Submitted</div>
                </div>
              )}
              {escrow.status === 2 && (
                <div className="flex items-center gap-3 text-sm">
                  <div className="w-2 h-2 rounded-full bg-green-400 flex-shrink-0" />
                  <div className="font-medium text-gray-700">Payment Released</div>
                </div>
              )}
              {escrow.status === 3 && (
                <div className="flex items-center gap-3 text-sm">
                  <div className="w-2 h-2 rounded-full bg-red-400 flex-shrink-0" />
                  <div className="font-medium text-gray-700">Dispute Raised</div>
                </div>
              )}
            </div>
          </div>

          <div className="card p-5">
            <h3 className="font-semibold text-gray-900 mb-3">Contract</h3>
            <a
              href={`https://amoy.polygonscan.com/address/${CONTRACT_ADDRESS}`}
              target="_blank" rel="noreferrer"
              className="text-xs text-brand-600 hover:underline font-mono break-all flex items-center gap-1"
            >
              {CONTRACT_ADDRESS?.substring(0, 20)}...
              <ExternalLink className="w-3 h-3 flex-shrink-0" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function EscrowPage() {
  return (
    <WalletProvider>
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="max-w-5xl mx-auto px-4 py-10">
          <EscrowDetail />
        </div>
      </div>
    </WalletProvider>
  );
}
