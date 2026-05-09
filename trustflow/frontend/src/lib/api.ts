import axios from "axios";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

export const api = axios.create({ baseURL: API });

export async function saveEscrow(data: {
  escrowId: number;
  txHash: string;
  clientWallet: string;
  freelancerWallet: string;
  projectTitle: string;
  milestoneDescription: string;
  githubRepo: string;
  amountWei: string;
  amountEth: string;
  networkId: string;
}) {
  const res = await api.post("/api/escrow", data);
  return res.data;
}

export async function getEscrowsByWallet(wallet: string) {
  const res = await api.get(`/api/escrow/wallet/${wallet}`);
  return res.data.escrows;
}

export async function updateEscrowStatus(escrowId: number, status: string, txHash?: string) {
  const res = await api.patch(`/api/escrow/${escrowId}/status`, { status, txHash });
  return res.data;
}

export async function submitWorkToBackend(escrowId: number, data: {
  commitHash: string;
  prLink: string;
  repoLink: string;
  freelancerWallet: string;
  verification: any;
  txHash: string;
}) {
  const res = await api.post(`/api/escrow/${escrowId}/submit-work`, data);
  return res.data;
}

export async function verifyGitHub(data: {
  commitHash: string;
  prLink: string;
  repoLink: string;
}) {
  const res = await api.post("/api/github/verify", data);
  return res.data;
}

export async function sendEscrowCreatedNotification(data: {
  escrowId: number;
  projectTitle: string;
  amountEth: string;
  clientPhone?: string;
  freelancerPhone?: string;
}) {
  await api.post("/api/notify/escrow-created", data);
}

export async function sendWorkSubmittedNotification(data: {
  escrowId: number;
  projectTitle: string;
  aiSummary: string;
  clientPhone?: string;
  freelancerPhone?: string;
}) {
  await api.post("/api/notify/work-submitted", data);
}

export async function sendPaymentReleasedNotification(data: {
  escrowId: number;
  projectTitle: string;
  amountEth: string;
  clientPhone?: string;
  freelancerPhone?: string;
  txHash?: string;
}) {
  await api.post("/api/notify/payment-released", data);
}
