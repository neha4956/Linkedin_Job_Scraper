// Copies the scraper's output into the dashboard's public folder so Vite can
// serve it as a static asset at /jobs.json during dev and in the build.
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const src = path.join(__dirname, "..", "..", "data", "jobs.json");
const dest = path.join(__dirname, "..", "public", "jobs.json");

if (!fs.existsSync(src)) {
  fs.writeFileSync(
    dest,
    JSON.stringify({ generatedAt: null, totalScraped: 0, totalMatched: 0, jobs: [] }, null, 2)
  );
  console.log("No data/jobs.json found yet, wrote empty placeholder to dashboard/public/jobs.json");
} else {
  fs.copyFileSync(src, dest);
  console.log(`Copied ${src} -> ${dest}`);
}
