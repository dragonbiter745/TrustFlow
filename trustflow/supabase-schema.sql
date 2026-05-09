-- TrustFlow Supabase Schema
-- Run this in Supabase SQL Editor

-- Escrows table
CREATE TABLE IF NOT EXISTS escrows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  escrow_id INTEGER UNIQUE NOT NULL,
  tx_hash TEXT,
  client_wallet TEXT NOT NULL,
  freelancer_wallet TEXT NOT NULL,
  project_title TEXT NOT NULL,
  milestone_description TEXT,
  github_repo TEXT,
  amount_wei TEXT,
  amount_eth TEXT,
  network_id TEXT DEFAULT '80002',
  status TEXT DEFAULT 'FUNDED' CHECK (status IN ('FUNDED','WORK_SUBMITTED','RELEASED','DISPUTED','REFUNDED')),
  release_tx_hash TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Work submissions table
CREATE TABLE IF NOT EXISTS work_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  escrow_id INTEGER REFERENCES escrows(escrow_id) ON DELETE CASCADE,
  commit_hash TEXT,
  pr_link TEXT,
  repo_link TEXT,
  freelancer_wallet TEXT NOT NULL,
  verification_data JSONB,
  ai_summary TEXT,
  tx_hash TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Notifications log
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  escrow_id INTEGER,
  type TEXT NOT NULL,
  recipient TEXT,
  message TEXT,
  twilio_sid TEXT,
  delivery_status TEXT DEFAULT 'sent',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_escrows_client ON escrows(client_wallet);
CREATE INDEX IF NOT EXISTS idx_escrows_freelancer ON escrows(freelancer_wallet);
CREATE INDEX IF NOT EXISTS idx_work_submissions_escrow ON work_submissions(escrow_id);

-- Row Level Security (optional - disable for MVP)
ALTER TABLE escrows ENABLE ROW LEVEL SECURITY;
ALTER TABLE work_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Allow all via service key (backend uses service key)
CREATE POLICY "Service key full access escrows" ON escrows FOR ALL USING (true);
CREATE POLICY "Service key full access work_submissions" ON work_submissions FOR ALL USING (true);
CREATE POLICY "Service key full access notifications" ON notifications FOR ALL USING (true);
