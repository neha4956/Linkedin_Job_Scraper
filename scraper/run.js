const fs = require("fs");
const path = require("path");
const { scrapeJobs } = require("./scrape");
const { scoreJob } = require("./scorer");
const profile = require("../data/profile.json");

async function run() {
  console.log("Scraping LinkedIn job search results...");
  const jobs = await scrapeJobs();
  console.log(`Scraped ${jobs.length} jobs within the configured time window.`);

  const matched = jobs
    .map((job) => ({ ...job, ...scoreJob(job, profile) }))
    .filter((job) => !job.excluded && job.score > 0)
    .sort((a, b) => b.score - a.score);

  const output = {
    generatedAt: new Date().toISOString(),
    totalScraped: jobs.length,
    totalMatched: matched.length,
    jobs: matched,
  };

  const outPath = path.join(__dirname, "..", "data", "jobs.json");
  fs.writeFileSync(outPath, JSON.stringify(output, null, 2));
  console.log(`Wrote ${matched.length} matched jobs to ${outPath}`);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
