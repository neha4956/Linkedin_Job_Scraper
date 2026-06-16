const fs       = require("fs");
const path     = require("path");
const puppeteer = require("puppeteer");
const config   = require("../config/search");
const { parseResume }        = require("./parseResume");
const { scrapeJobs }         = require("./scrape");
const { fetchDescriptions }  = require("./fetchDescriptions");
const { scoreJob }           = require("./scorer");

const PROFILE_PATH = path.join(__dirname, "..", "data", "profile.json");

async function loadProfile() {
  // 1. Try to parse skills live from the resume PDF
  if (config.resumePath && fs.existsSync(config.resumePath)) {
    console.log(`Parsing resume: ${path.basename(config.resumePath)} (parser: ${config.resumeParserType})`);
    const parsed = await parseResume(config.resumePath, config.resumeParserType);

    if (parsed) {
      parsed.yearsOfExperience = config.yearsOfExperience ?? parsed.yearsOfExperience;
      // Persist so the user can inspect / tweak what was extracted
      fs.writeFileSync(PROFILE_PATH, JSON.stringify(parsed, null, 2));
      console.log(`  mustHave   → ${parsed.mustHave.join(", ")}`);
      console.log(`  niceToHave → ${parsed.niceToHave.join(", ")}`);
      console.log(`  YOE        → ${parsed.yearsOfExperience}`);
      return parsed;
    }

    console.warn("  Could not parse Technical Skills section — falling back to data/profile.json");
  }

  // 2. Fall back to the last saved profile.json
  const saved = JSON.parse(fs.readFileSync(PROFILE_PATH, "utf8"));
  saved.yearsOfExperience = config.yearsOfExperience ?? saved.yearsOfExperience;
  return saved;
}

async function run() {
  const profile = await loadProfile();

  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  try {
    console.log("\nStep 1/3 — Scraping job listings…");
    const jobs = await scrapeJobs(browser, (msg) => console.log(" ", msg));
    console.log(`  Found ${jobs.length} unique relevant jobs.`);

    console.log("\nStep 2/3 — Fetching job descriptions…");
    const jobsWithDesc = await fetchDescriptions(browser, jobs, (msg) => console.log(" ", msg));

    console.log("\nStep 3/3 — Scoring against your profile…");
    const matched = jobsWithDesc
      .map((job) => ({ ...job, ...scoreJob(job, profile) }))
      .filter((job) => !job.excluded && job.score > 0)
      .sort((a, b) => b.score - a.score);

    const output = {
      generatedAt:  new Date().toISOString(),
      totalScraped: jobs.length,
      totalMatched: matched.length,
      jobs:         matched,
    };

    fs.writeFileSync(path.join(__dirname, "..", "data", "jobs.json"), JSON.stringify(output, null, 2));
    console.log(`\n  Done — ${matched.length} matched jobs written to data/jobs.json`);
  } finally {
    await browser.close();
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
