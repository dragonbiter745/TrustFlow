const express = require("express");
const router = express.Router();
const axios = require("axios");
const Groq = require("groq-sdk");

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// Verify GitHub commit and PR, then generate AI summary + milestone verdict
router.post("/verify", async (req, res) => {
  const { commitHash, prLink, repoLink, milestoneDescription } = req.body;

  if (!repoLink) {
    return res.status(400).json({ error: "repoLink is required" });
  }

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
    // New metrics
    totalCommits: 0,
    recentActivity: [],
    languages: {},
    milestoneVerdict: null, // PASS / PARTIAL / FAIL
    milestoneScore: 0,      // 0-100
    milestoneReasoning: "",
    aiSummary: null,
  };

  // 1. Verify repo exists + get metadata
  try {
    const repoRes = await axios.get(
      `https://api.github.com/repos/${owner}/${repoClean}`,
      { headers }
    );
    result.repoExists = true;
    result.repoData = {
      fullName: repoRes.data.full_name,
      description: repoRes.data.description,
      stars: repoRes.data.stargazers_count,
      defaultBranch: repoRes.data.default_branch,
    };
  } catch (e) {
    return res.status(404).json({ error: "Repository not found or inaccessible" });
  }

  // 2. Fetch total commit count + recent activity timeline
  try {
    const commitsRes = await axios.get(
      `https://api.github.com/repos/${owner}/${repoClean}/commits?per_page=100`,
      { headers }
    );
    result.totalCommits = commitsRes.data.length;
    result.recentActivity = commitsRes.data.slice(0, 5).map((c) => ({
      sha: c.sha.substring(0, 7),
      message: c.commit.message.split("\n")[0],
      author: c.commit.author.name,
      date: c.commit.author.date,
    }));
  } catch (e) {
    // non-fatal
  }

  // 3. Fetch language breakdown
  try {
    const langRes = await axios.get(
      `https://api.github.com/repos/${owner}/${repoClean}/languages`,
      { headers }
    );
    result.languages = langRes.data;
  } catch (e) {
    // non-fatal
  }

  // 4. Verify specific commit if provided
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

  // 5. Verify PR if provided
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

  // 6. Fetch README for project context
  let readmeText = "";
  try {
    const readmeRes = await axios.get(
      `https://api.github.com/repos/${owner}/${repoClean}/readme`,
      { headers }
    );
    readmeText = Buffer.from(readmeRes.data.content, "base64")
      .toString("utf-8")
      .substring(0, 1500);
  } catch (e) {
    // README not found — continue without it
  }

  // 7. Groq AI: Milestone Verdict + Summary
  try {
    const evidenceParts = [];

    if (readmeText) {
      evidenceParts.push(`Project README:\n${readmeText}\n---`);
    }

    evidenceParts.push(`Repository: ${owner}/${repoClean}`);
    evidenceParts.push(`Total commits in repo: ${result.totalCommits}`);

    if (Object.keys(result.languages).length > 0) {
      const langList = Object.entries(result.languages)
        .map(([lang, bytes]) => `${lang} (${bytes} bytes)`)
        .join(", ");
      evidenceParts.push(`Languages used: ${langList}`);
    }

    if (result.recentActivity.length > 0) {
      const activityList = result.recentActivity
        .map((c) => `  - [${c.date.substring(0, 10)}] ${c.message} (by ${c.author})`)
        .join("\n");
      evidenceParts.push(`Recent commit activity:\n${activityList}`);
    }

    if (result.commitData) {
      evidenceParts.push(`Submitted commit: "${result.commitData.message}" by ${result.commitData.author} on ${result.commitData.date}`);
      evidenceParts.push(`Code changes: +${result.commitData.additions} lines added, -${result.commitData.deletions} lines removed`);
      if (result.filesChanged.length > 0) {
        evidenceParts.push(`Files changed: ${result.filesChanged.map((f) => f.filename).join(", ")}`);
      }
    }

    if (result.prData) {
      evidenceParts.push(`Pull Request: "${result.prData.title}" - ${result.prData.merged ? "MERGED ✓" : result.prData.state}`);
      evidenceParts.push(`PR scope: +${result.prData.additions} -${result.prData.deletions} across ${result.prData.changedFiles} files`);
    }

    const milestone = milestoneDescription || "Complete the assigned work as described";

    const verdictPrompt = `You are an impartial technical auditor for TrustFlow, a blockchain escrow platform for freelancers.

MILESTONE REQUIREMENT (what the client asked for):
"${milestone}"

EVIDENCE OF WORK (what the freelancer actually did):
${evidenceParts.join("\n")}

Your job:
1. Evaluate whether the evidence satisfies the milestone requirement.
2. Give a VERDICT: PASS, PARTIAL, or FAIL
3. Give a SCORE from 0-100 representing how well the milestone was met.
4. Write a 2-3 sentence SUMMARY of what was accomplished.
5. Write 1 sentence of REASONING for your verdict.

Respond in this EXACT JSON format (no markdown, no extra text):
{"verdict":"PASS","score":85,"summary":"The freelancer delivered...","reasoning":"The milestone required X and the evidence shows Y..."}`;

    const aiRes = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      max_tokens: 350,
      temperature: 0.3,
      messages: [{ role: "user", content: verdictPrompt }],
    });

    const raw = aiRes.choices[0].message.content.trim();
    // Extract JSON from response
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      result.milestoneVerdict = parsed.verdict || "PARTIAL";
      result.milestoneScore = parsed.score || 50;
      result.aiSummary = parsed.summary || raw;
      result.milestoneReasoning = parsed.reasoning || "";
    } else {
      result.aiSummary = raw;
      result.milestoneVerdict = "PARTIAL";
      result.milestoneScore = 50;
    }
  } catch (e) {
    result.aiSummary = "GitHub work submission verified successfully.";
    result.milestoneVerdict = "PARTIAL";
    result.milestoneScore = 50;
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
