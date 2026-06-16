const express = require("express");
const { spawn } = require("child_process");
const path = require("path");
const fs = require("fs");

const app = express();
const PORT = 3001;
const JOBS_PATH = path.join(__dirname, "data", "jobs.json");

let scrapeRunning = false;

app.get("/api/jobs", (req, res) => {
  if (!fs.existsSync(JOBS_PATH)) {
    return res.json({ generatedAt: null, totalScraped: 0, totalMatched: 0, jobs: [] });
  }
  res.sendFile(JOBS_PATH);
});

app.get("/api/scrape/status", (req, res) => {
  res.json({ running: scrapeRunning });
});

app.post("/api/scrape", (req, res) => {
  if (scrapeRunning) {
    return res.status(409).json({ error: "Scrape already in progress" });
  }
  scrapeRunning = true;

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders();

  function sendLine(line) {
    if (line) res.write(`data: ${line}\n\n`);
  }

  const child = spawn("node", ["scraper/run.js"], { cwd: __dirname });

  let stderrBuf = "";

  child.stdout.on("data", (chunk) => {
    chunk.toString().split("\n").forEach(sendLine);
  });

  child.stderr.on("data", (chunk) => {
    stderrBuf += chunk.toString();
    chunk.toString().split("\n").forEach((l) => { if (l) sendLine(`[err] ${l}`); });
  });

  child.on("close", (code) => {
    scrapeRunning = false;
    if (code !== 0) {
      sendLine(`__DONE__:error:${stderrBuf.split("\n")[0] || "non-zero exit"}`);
    } else {
      sendLine("__DONE__:ok");
    }
    res.end();
  });
});

// Serve built dashboard in production
app.use(express.static(path.join(__dirname, "dashboard", "dist")));

app.listen(PORT, () => console.log(`API server → http://localhost:${PORT}`));
