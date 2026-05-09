const express = require("express");
const router = express.Router();
const axios = require("axios");
const Groq = require("groq-sdk");

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// Verify GitHub commit and PR, then generate AI summary
router.post("/verify", async (req, res) => {
  const { commitHash, prLink, repoLink } = req.body;

  if (!repoLink) {
    return res.status(400).json({ error: "repoLink is required" });
  }

  // Parse owner/repo from URL
  const repoMatch = repoLink.match(/github\.com\/([^\/]+)\/([^\/]+)/);
  if (!repoMatch) {
    return res.status(400).json({ error: "Invalid GitHub repo URL" });
  }
  const [, owner, repo] = repoMatch;
  const repoClean = repo.replace(/\.git$/, "");

  const headers = {
    Authorization: `token ${process.env.GITHUB_TOKEN}`,
    Accept: "application/vnd.github.v3+json",
  };

  const result = {
    repoExists: false,
    commitVerified: false,
    prVerified: false,
    commitData: null,
    prData: null,
    filesChanged: [],
    aiSummary: null,
  };

  try {
    // 1. Verify repo exists
    const repoRes = await axios.get(
      `https://api.github.com/repos/${owner}/${repoClean}`,
      { headers }
    );
    result.repoExists = true;
    result.repoData = {
      fullName: repoRes.data.full_name,
      description: repoRes.data.description,
      stars: repoRes.data.stargazers_count,
    };
  } catch (e) {
    return res.status(404).json({ error: "Repository not found or inaccessible" });
  }

  // 2. Verify commit if provided
  if (commitHash) {
    try {
      const commitRes = await axios.get(
        `https://api.github.com/repos/${owner}/${repoClean}/commits/${commitHash}`,
        { headers }
      );
      result.commitVerified = true;
      result.commitData = {
        sha: commitRes.data.sha,
        message: commitRes.data.commit.message,
        author: commitRes.data.commit.author.name,
        date: commitRes.data.commit.author.date,
        additions: commitRes.data.stats?.additions,
        deletions: commitRes.data.stats?.deletions,
      };
      result.filesChanged = (commitRes.data.files || []).map((f) => ({
        filename: f.filename,
        status: f.status,
        additions: f.additions,
        deletions: f.deletions,
      }));
    } catch (e) {
      result.commitVerified = false;
      result.commitError = "Commit not found";
    }
  }

  // 3. Verify PR if provided
  if (prLink) {
    const prMatch = prLink.match(/github\.com\/[^\/]+\/[^\/]+\/pull\/(\d+)/);
    if (prMatch) {
      const prNumber = prMatch[1];
      try {
        const prRes = await axios.get(
          `https://api.github.com/repos/${owner}/${repoClean}/pulls/${prNumber}`,
          { headers }
        );
        result.prVerified = true;
        result.prData = {
          title: prRes.data.title,
          state: prRes.data.state,
          merged: prRes.data.merged,
          mergedAt: prRes.data.merged_at,
          additions: prRes.data.additions,
          deletions: prRes.data.deletions,
          changedFiles: prRes.data.changed_files,
          author: prRes.data.user?.login,
        };
      } catch (e) {
        result.prVerified = false;
        result.prError = "PR not found";
      }
    }
  }

  // 4. Fetch README for project context
  let readmeText = "";
  try {
    const readmeRes = await axios.get(
      `https://api.github.com/repos/${owner}/${repoClean}/readme`,
      { headers }
    );
    // GitHub returns README content as base64
    readmeText = Buffer.from(readmeRes.data.content, "base64")
      .toString("utf-8")
      .substring(0, 1500); // cap to avoid huge prompts
  } catch (e) {
    // README not found or private — continue without it
  }

  // 5. AI Summary using Groq (llama-3.3-70b-versatile)
  try {
    const contextParts = [];

    if (readmeText) {
      contextParts.push(`Project README (for context):\n${readmeText}`);
      contextParts.push("---");
    }

    if (result.commitData) {
      contextParts.push(`Commit: "${result.commitData.message}" by ${result.commitData.author} on ${result.commitData.date}`);
      contextParts.push(`Changes: +${result.commitData.additions} -${result.commitData.deletions} lines`);
      if (result.filesChanged.length > 0) {
        contextParts.push(`Files changed: ${result.filesChanged.map((f) => f.filename).join(", ")}`);
      }
    }
    if (result.prData) {
      contextParts.push(`PR: "${result.prData.title}" - ${result.prData.merged ? "MERGED" : result.prData.state}`);
      contextParts.push(`PR stats: +${result.prData.additions} -${result.prData.deletions} across ${result.prData.changedFiles} files`);
    }

    const prompt = contextParts.length > 0
      ? `You are reviewing a freelance work submission on TrustFlow, a blockchain escrow platform.\n\nSummarize what the freelancer accomplished in 1-2 concise, specific sentences. Reference the project context from the README if available. Be professional and technical.\n\n${contextParts.join("\n")}`
      : `Generate a brief professional summary that GitHub work was submitted for repo ${owner}/${repoClean}. Keep it 1 sentence.`;

    const aiRes = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      max_tokens: 200,
      messages: [{ role: "user", content: prompt }],
    });
    result.aiSummary = aiRes.choices[0].message.content.trim();
  } catch (e) {
    result.aiSummary = "GitHub work submission verified successfully.";
  }

  res.json({ success: true, verification: result });
});


// Get recent commits for a repo (for display)
router.get("/commits", async (req, res) => {
  const { repo } = req.query;
  if (!repo) return res.status(400).json({ error: "repo required" });

  const repoMatch = repo.match(/github\.com\/([^\/]+)\/([^\/]+)/);
  if (!repoMatch) return res.status(400).json({ error: "Invalid repo URL" });

  const [, owner, repoName] = repoMatch;

  try {
    const headers = {
      Authorization: `token ${process.env.GITHUB_TOKEN}`,
      Accept: "application/vnd.github.v3+json",
    };
    const res2 = await axios.get(
      `https://api.github.com/repos/${owner}/${repoName}/commits?per_page=5`,
      { headers }
    );
    const commits = res2.data.map((c) => ({
      sha: c.sha,
      shortSha: c.sha.substring(0, 7),
      message: c.commit.message.split("\n")[0],
      author: c.commit.author.name,
      date: c.commit.author.date,
    }));
    res.json({ commits });
  } catch (e) {
    res.status(500).json({ error: "Failed to fetch commits" });
  }
});

module.exports = router;
