export const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || "";

export const ESCROW_ABI = [
  {
    "inputs": [],
    "stateMutability": "nonpayable",
    "type": "constructor"
  },
  {
    "anonymous": false,
    "inputs": [
      { "indexed": true, "name": "id", "type": "uint256" },
      { "indexed": true, "name": "client", "type": "address" },
      { "indexed": true, "name": "freelancer", "type": "address" },
      { "indexed": false, "name": "amount", "type": "uint256" },
      { "indexed": false, "name": "projectTitle", "type": "string" }
    ],
    "name": "EscrowCreated",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      { "indexed": true, "name": "id", "type": "uint256" },
      { "indexed": false, "name": "workProof", "type": "string" }
    ],
    "name": "WorkSubmitted",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      { "indexed": true, "name": "id", "type": "uint256" },
      { "indexed": true, "name": "freelancer", "type": "address" },
      { "indexed": false, "name": "amount", "type": "uint256" }
    ],
    "name": "FundsReleased",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      { "indexed": true, "name": "id", "type": "uint256" },
      { "indexed": true, "name": "raisedBy", "type": "address" }
    ],
    "name": "DisputeRaised",
    "type": "event"
  },
  {
    "inputs": [
      { "name": "_freelancer", "type": "address" },
      { "name": "_projectTitle", "type": "string" },
      { "name": "_milestoneDescription", "type": "string" },
      { "name": "_githubRepo", "type": "string" }
    ],
    "name": "createEscrow",
    "outputs": [{ "name": "", "type": "uint256" }],
    "stateMutability": "payable",
    "type": "function"
  },
  {
    "inputs": [
      { "name": "escrowId", "type": "uint256" },
      { "name": "_workProof", "type": "string" }
    ],
    "name": "submitWork",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{ "name": "escrowId", "type": "uint256" }],
    "name": "approveRelease",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{ "name": "escrowId", "type": "uint256" }],
    "name": "raiseDispute",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{ "name": "escrowId", "type": "uint256" }],
    "name": "getEscrow",
    "outputs": [
      {
        "components": [
          { "name": "id", "type": "uint256" },
          { "name": "client", "type": "address" },
          { "name": "freelancer", "type": "address" },
          { "name": "amount", "type": "uint256" },
          { "name": "projectTitle", "type": "string" },
          { "name": "milestoneDescription", "type": "string" },
          { "name": "githubRepo", "type": "string" },
          { "name": "status", "type": "uint8" },
          { "name": "workProof", "type": "string" },
          { "name": "createdAt", "type": "uint256" },
          { "name": "updatedAt", "type": "uint256" }
        ],
        "name": "",
        "type": "tuple"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{ "name": "client", "type": "address" }],
    "name": "getClientEscrows",
    "outputs": [{ "name": "", "type": "uint256[]" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{ "name": "freelancer", "type": "address" }],
    "name": "getFreelancerEscrows",
    "outputs": [{ "name": "", "type": "uint256[]" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "nextEscrowId",
    "outputs": [{ "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  }
];

export const POLYGON_AMOY = {
  chainId: "0x13882",
  chainName: "Polygon Amoy Testnet",
  nativeCurrency: { name: "MATIC", symbol: "MATIC", decimals: 18 },
  rpcUrls: ["https://rpc-amoy.polygon.technology"],
  blockExplorerUrls: ["https://amoy.polygonscan.com"],
};

export const STATUS_MAP: Record<number, string> = {
  0: "FUNDED",
  1: "WORK_SUBMITTED",
  2: "RELEASED",
  3: "DISPUTED",
  4: "REFUNDED",
};
