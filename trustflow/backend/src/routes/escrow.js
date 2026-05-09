const express = require("express");
const router = express.Router();

// Save escrow record after on-chain creation
router.post("/", async (req, res) => {
  const supabase = req.app.locals.supabase;
  const {
    escrowId,
    txHash,
    clientWallet,
    freelancerWallet,
    projectTitle,
    milestoneDescription,
    githubRepo,
    amountWei,
    amountEth,
    networkId,
  } = req.body;

  const { data, error } = await supabase
    .from("escrows")
    .insert([{
      escrow_id: escrowId,
      tx_hash: txHash,
      client_wallet: clientWallet.toLowerCase(),
      freelancer_wallet: freelancerWallet.toLowerCase(),
      project_title: projectTitle,
      milestone_description: milestoneDescription,
      github_repo: githubRepo,
      amount_wei: amountWei,
      amount_eth: amountEth,
      network_id: networkId,
      status: "FUNDED",
    }])
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true, escrow: data });
});

// Get escrows by wallet (client or freelancer)
router.get("/wallet/:wallet", async (req, res) => {
  const supabase = req.app.locals.supabase;
  const wallet = req.params.wallet.toLowerCase();

  const { data, error } = await supabase
    .from("escrows")
    .select("*, work_submissions(*), notifications(*)")
    .or(`client_wallet.eq.${wallet},freelancer_wallet.eq.${wallet}`)
    .order("created_at", { ascending: false });

  if (error) return res.status(500).json({ error: error.message });
  res.json({ escrows: data });
});

// Get single escrow
router.get("/:escrowId", async (req, res) => {
  const supabase = req.app.locals.supabase;
  const { data, error } = await supabase
    .from("escrows")
    .select("*, work_submissions(*), notifications(*)")
    .eq("escrow_id", req.params.escrowId)
    .single();

  if (error) return res.status(404).json({ error: "Escrow not found" });
  res.json({ escrow: data });
});

// Update escrow status (called after on-chain tx)
router.patch("/:escrowId/status", async (req, res) => {
  const supabase = req.app.locals.supabase;
  const { status, txHash } = req.body;

  const validStatuses = ["FUNDED", "WORK_SUBMITTED", "RELEASED", "DISPUTED", "REFUNDED"];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ error: "Invalid status" });
  }

  const update = { status, updated_at: new Date().toISOString() };
  if (txHash) update.release_tx_hash = txHash;

  const { data, error } = await supabase
    .from("escrows")
    .update(update)
    .eq("escrow_id", req.params.escrowId)
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true, escrow: data });
});

// Save work submission
router.post("/:escrowId/submit-work", async (req, res) => {
  const supabase = req.app.locals.supabase;
  const {
    commitHash,
    prLink,
    repoLink,
    freelancerWallet,
    verification,
    txHash,
  } = req.body;

  // Save work submission
  const { data: submission, error: subError } = await supabase
    .from("work_submissions")
    .insert([{
      escrow_id: req.params.escrowId,
      commit_hash: commitHash,
      pr_link: prLink,
      repo_link: repoLink,
      freelancer_wallet: freelancerWallet.toLowerCase(),
      verification_data: verification,
      ai_summary: verification?.aiSummary,
      tx_hash: txHash,
    }])
    .select()
    .single();

  if (subError) return res.status(500).json({ error: subError.message });

  // Update escrow status
  await supabase
    .from("escrows")
    .update({ status: "WORK_SUBMITTED", updated_at: new Date().toISOString() })
    .eq("escrow_id", req.params.escrowId);

  res.json({ success: true, submission });
});

module.exports = router;
