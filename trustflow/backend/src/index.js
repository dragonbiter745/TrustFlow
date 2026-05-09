require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { createClient } = require("@supabase/supabase-js");

const githubRoutes = require("./routes/github");
const escrowRoutes = require("./routes/escrow");
const notifyRoutes = require("./routes/notify");

const app = express();
app.use(cors());
app.use(express.json());

// Supabase client (shared across routes)
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);
app.locals.supabase = supabase;

app.use("/api/github", githubRoutes);
app.use("/api/escrow", escrowRoutes);
app.use("/api/notify", notifyRoutes);

app.get("/health", (req, res) => res.json({ status: "ok", service: "TrustFlow API" }));

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`TrustFlow backend running on port ${PORT}`));
