const express = require("express");
const router = express.Router();
const twilio = require("twilio");

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

const WHATSAPP_FROM = `whatsapp:${process.env.TWILIO_WHATSAPP_FROM}`;

async function sendWhatsApp(to, message, supabase, escrowId, type) {
  const toFormatted = `whatsapp:${to}`;
  let sid = null;
  let deliveryStatus = "sent";

  try {
    const msg = await client.messages.create({
      from: WHATSAPP_FROM,
      to: toFormatted,
      body: message,
    });
    sid = msg.sid;
  } catch (e) {
    console.error("WhatsApp send error:", e.message);
    deliveryStatus = "failed";
  }

  // Log to Supabase
  if (supabase && escrowId) {
    await supabase.from("notifications").insert([{
      escrow_id: escrowId,
      type,
      recipient: to,
      message,
      twilio_sid: sid,
      delivery_status: deliveryStatus,
    }]);
  }

  return { sid, deliveryStatus };
}

// Send escrow created notification
router.post("/escrow-created", async (req, res) => {
  const supabase = req.app.locals.supabase;
  const { escrowId, projectTitle, amountEth, clientPhone, freelancerPhone } = req.body;

  const results = [];

  if (clientPhone) {
    const r = await sendWhatsApp(
      clientPhone,
      `✅ *TrustFlow Escrow Created*\n\nProject: ${projectTitle}\nAmount: ${amountEth} MATIC\nEscrow ID: #${escrowId}\n\nFunds are locked securely. Freelancer has been notified.`,
      supabase, escrowId, "ESCROW_CREATED"
    );
    results.push({ to: "client", ...r });
  }

  if (freelancerPhone) {
    const r = await sendWhatsApp(
      freelancerPhone,
      `🔔 *TrustFlow: New Project*\n\nProject: ${projectTitle}\nAmount: ${amountEth} MATIC\nEscrow ID: #${escrowId}\n\nFunds are locked. Submit your work to release payment.`,
      supabase, escrowId, "ESCROW_CREATED"
    );
    results.push({ to: "freelancer", ...r });
  }

  res.json({ success: true, results });
});

// Send work submitted notification
router.post("/work-submitted", async (req, res) => {
  const supabase = req.app.locals.supabase;
  const { escrowId, projectTitle, aiSummary, clientPhone, freelancerPhone } = req.body;

  const results = [];

  if (clientPhone) {
    const r = await sendWhatsApp(
      clientPhone,
      `📋 *TrustFlow: Work Submitted*\n\nProject: ${projectTitle}\nEscrow ID: #${escrowId}\n\n*Work Summary:*\n${aiSummary || "Work has been submitted for your review."}\n\nPlease review and approve payment release.`,
      supabase, escrowId, "WORK_SUBMITTED"
    );
    results.push({ to: "client", ...r });
  }

  if (freelancerPhone) {
    const r = await sendWhatsApp(
      freelancerPhone,
      `✅ *TrustFlow: Work Submission Confirmed*\n\nProject: ${projectTitle}\nEscrow ID: #${escrowId}\n\nYour work has been submitted. Waiting for client approval.`,
      supabase, escrowId, "WORK_SUBMITTED"
    );
    results.push({ to: "freelancer", ...r });
  }

  res.json({ success: true, results });
});

// Send payment released notification
router.post("/payment-released", async (req, res) => {
  const supabase = req.app.locals.supabase;
  const { escrowId, projectTitle, amountEth, clientPhone, freelancerPhone, txHash } = req.body;

  const results = [];

  if (freelancerPhone) {
    const r = await sendWhatsApp(
      freelancerPhone,
      `💸 *TrustFlow: Payment Released!*\n\nProject: ${projectTitle}\nAmount: ${amountEth} MATIC\nEscrow ID: #${escrowId}\n\nTx: ${txHash ? txHash.substring(0, 20) + "..." : "On-chain"}\n\nFunds sent to your wallet. Thank you!`,
      supabase, escrowId, "PAYMENT_RELEASED"
    );
    results.push({ to: "freelancer", ...r });
  }

  if (clientPhone) {
    const r = await sendWhatsApp(
      clientPhone,
      `✅ *TrustFlow: Payment Confirmed*\n\nProject: ${projectTitle}\nAmount: ${amountEth} MATIC\nEscrow ID: #${escrowId}\n\nPayment has been released to the freelancer. Project complete!`,
      supabase, escrowId, "PAYMENT_RELEASED"
    );
    results.push({ to: "client", ...r });
  }

  res.json({ success: true, results });
});

module.exports = router;
