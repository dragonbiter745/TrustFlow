# TrustFlow — Blockchain Escrow for Freelancers

> Lock funds. Verify GitHub work. Release payment. Trustless.

TrustFlow is a production-ready blockchain escrow platform on Polygon Amoy where clients lock funds in a smart contract, freelancers submit GitHub commits as proof-of-work, and Claude AI summarizes the work before the client releases payment.

---

## Architecture

```
trustflow/
├── contracts/          # Solidity smart contract
│   └── TrustFlowEscrow.sol
├── backend/            # Node.js + Express API
│   └── src/
│       ├── index.js
│       └── routes/
│           ├── github.js   # GitHub verification + AI summary
│           ├── escrow.js   # Supabase CRUD
│           └── notify.js   # Twilio WhatsApp
├── frontend/           # Next.js app
│   └── src/app/
│       ├── page.tsx        # Landing page
│       ├── dashboard/      # Wallet dashboard
│       └── escrow/
│           ├── create/     # Create escrow form
│           └── [id]/       # Escrow detail + actions
└── supabase-schema.sql
```

---

## Quick Start

### Prerequisites
- Node.js 18+
- MetaMask browser extension
- Polygon Amoy testnet MATIC (free from faucet)

---

## 1. Smart Contract Deployment (Remix IDE)

1. Go to [remix.ethereum.org](https://remix.ethereum.org)
2. Create new file, paste contents of `contracts/TrustFlowEscrow.sol`
3. Compile with Solidity **0.8.19**
4. In **Deploy & Run**:
   - Environment: **Injected Provider — MetaMask**
   - Make sure MetaMask is on **Polygon Amoy Testnet** (Chain ID: 80002)
5. Click **Deploy** and confirm in MetaMask
6. Copy the deployed contract address

**Add Polygon Amoy to MetaMask:**
- Network Name: Polygon Amoy Testnet
- RPC URL: https://rpc-amoy.polygon.technology
- Chain ID: 80002
- Symbol: MATIC
- Explorer: https://amoy.polygonscan.com

**Get testnet MATIC:**
- https://faucet.polygon.technology (select Amoy)

---

## 2. Supabase Setup

1. Create project at [supabase.com](https://supabase.com)
2. Go to **SQL Editor**
3. Run the contents of `supabase-schema.sql`
4. Get credentials from **Settings → API**:
   - Project URL → `SUPABASE_URL`
   - `service_role` key (secret) → `SUPABASE_SERVICE_KEY`

---

## 3. Backend Setup

```bash
cd backend
cp .env.example .env
# Fill in all values in .env
npm install
npm run dev
```

Backend runs on `http://localhost:4000`

**Required .env values:**
```
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_KEY=eyJ...
ANTHROPIC_API_KEY=sk-ant-...
GITHUB_TOKEN=ghp_...
TWILIO_ACCOUNT_SID=AC...
TWILIO_AUTH_TOKEN=...
TWILIO_WHATSAPP_FROM=+14155238886
```

---

## 4. Frontend Setup

```bash
cd frontend
cp .env.example .env.local
# Fill in values
npm install
npm run dev
```

Frontend runs on `http://localhost:3000`

**Required .env.local values:**
```
NEXT_PUBLIC_API_URL=http://localhost:4000
NEXT_PUBLIC_CONTRACT_ADDRESS=0x...  ← Your deployed contract
NEXT_PUBLIC_NETWORK_ID=80002
NEXT_PUBLIC_RPC_URL=https://rpc-amoy.polygon.technology
```

---

## 5. GitHub API Setup

1. Go to [github.com/settings/tokens](https://github.com/settings/tokens)
2. Generate a **Classic token** or **Fine-grained token**
3. Required scopes: `public_repo` (or `repo` for private repos)
4. Paste as `GITHUB_TOKEN` in backend `.env`

**What is verified:**
- Repository existence
- Commit exists and shows author, message, files changed
- PR merged status and stats
- Claude AI generates a 1-2 sentence summary

---

## 6. Twilio WhatsApp Setup

1. Create account at [twilio.com](https://twilio.com)
2. Go to **Messaging → Try it out → Send a WhatsApp message**
3. Join the WhatsApp sandbox: send the join code to `+14155238886`
4. Get credentials from **Account → API keys & tokens**:
   - `TWILIO_ACCOUNT_SID`
   - `TWILIO_AUTH_TOKEN`
5. `TWILIO_WHATSAPP_FROM` = `+14155238886` (sandbox number)

**For production:** Apply for WhatsApp Business API via Twilio.

**Notifications sent:**
- ✅ Escrow created (client + freelancer)
- 📋 Work submitted (client review alert)
- 💸 Payment released (freelancer confirmation)

---

## 7. MetaMask Integration

The app uses `window.ethereum` directly via ethers.js v6. No WalletConnect required.

**Flow:**
1. User clicks "Connect Wallet"
2. MetaMask prompts for permission
3. App detects chain — prompts to switch to Polygon Amoy if needed
4. `ethers.BrowserProvider` wraps `window.ethereum`
5. `signer.sendTransaction()` is used for all contract interactions

---

## User Flows

### Client Flow
1. Connect MetaMask on Polygon Amoy
2. Click "Create Escrow"
3. Fill: freelancer wallet, project title, milestone, GitHub repo, MATIC amount
4. Confirm transaction in MetaMask → funds locked on-chain
5. Wait for freelancer to submit work
6. Review AI work summary
7. Click "Approve & Release Payment" → funds sent to freelancer

### Freelancer Flow
1. Connect MetaMask
2. Find your escrow in Dashboard
3. Click "Submit Work"
4. Enter GitHub repo, commit hash, PR link
5. Click "Verify on GitHub" → AI summary generated
6. Click "Submit Work On-Chain" → transaction confirmed
7. Wait for client to release payment

---

## Smart Contract Functions

| Function | Who | Description |
|----------|-----|-------------|
| `createEscrow()` | Client | Lock MATIC, set freelancer + milestone |
| `submitWork()` | Freelancer | Submit proof-of-work JSON on-chain |
| `approveRelease()` | Client | Send 99% to freelancer, 1% platform fee |
| `raiseDispute()` | Either | Flag escrow for manual review |
| `resolveDispute()` | Owner | Refund client or pay freelancer |
| `getEscrow()` | Anyone | Read escrow details |
| `getClientEscrows()` | Anyone | List client's escrow IDs |
| `getFreelancerEscrows()` | Anyone | List freelancer's escrow IDs |

---

## API Endpoints

```
POST   /api/escrow              → Save new escrow to DB
GET    /api/escrow/wallet/:addr → Get all escrows for wallet
GET    /api/escrow/:id          → Get single escrow
PATCH  /api/escrow/:id/status   → Update status
POST   /api/escrow/:id/submit-work → Save work submission

POST   /api/github/verify       → Verify commit/PR + AI summary
GET    /api/github/commits?repo=URL → List recent commits

POST   /api/notify/escrow-created  → WhatsApp: escrow created
POST   /api/notify/work-submitted  → WhatsApp: work submitted
POST   /api/notify/payment-released → WhatsApp: payment released
```

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Smart Contract | Solidity 0.8.19, Polygon Amoy |
| Frontend | Next.js 14, TypeScript, TailwindCSS |
| Web3 | ethers.js v6, MetaMask |
| Backend | Node.js, Express |
| Database | Supabase (PostgreSQL) |
| AI | Groq (llama-3.3-70b-versatile) |
| GitHub | GitHub REST API v3 |
| Notifications | Twilio WhatsApp Sandbox |

---

## Deployment (Production)

**Backend:** Deploy to Railway, Render, or Fly.io
**Frontend:** Deploy to Vercel — set all `NEXT_PUBLIC_*` env vars

```bash
# Frontend Vercel deploy
cd frontend
vercel --prod

# Backend Railway deploy
cd backend
railway up
```

---

## License

MIT
