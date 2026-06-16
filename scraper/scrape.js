const searchConfig = require("../config/search");

const BASE_URL = "https://www.linkedin.com/jobs/search";

// Titles matching any of these words/phrases are dropped before description
// fetching — saves time and requests on clearly non-React/Frontend roles.
// Uses word-boundary regex so "java" doesn't accidentally skip "javascript".
const SKIP_TITLE_WORDS = [
  "android", "ios", "flutter",
  "backend", "back-end", "back end",
  "java(?!script)", "\\.net", "dotnet", "golang", "rust", "c\\+\\+", "c/c\\+\\+",
  "python", "machine learning", "ml engineer", "llm", "ai/ml",
  "data engineer", "data scientist", "data analyst",
  "devops", "site reliability", "sre", "infrastructure", "cloud engineer",
  "embedded", "firmware", "fpga", "vlsi", "vhdl", "hardware",
  "sdet", "test engineer", "performance test", "qa\\b", "quality assurance",
  "sap", "servicenow", "salesforce", "apex developer", "powerapp",
  "mainframe", "cobol", "as400", "iseries",
  "cable", "railway", "civil", "structural", "mechanical",
  "compiler", "kernel", "network engineer",
];

const SKIP_TITLE_RE = new RegExp(
  `\\b(${SKIP_TITLE_WORDS.join("|")})\\b`,
  "i"
);

function isTitleRelevant(title) {
  return !SKIP_TITLE_RE.test(title);
}

function buildSearchUrl(keyword, location, geoId, start = 0) {
  const params = new URLSearchParams();
  params.set("keywords", keyword);
  params.set("location", location);
  if (geoId) params.set("geoId", geoId);
  params.set("f_TPR", `r${searchConfig.postedWithinSeconds}`);
  if (searchConfig.experienceLevels.length) params.set("f_E", searchConfig.experienceLevels.join(","));
  if (searchConfig.jobTypes.length) params.set("f_JT", searchConfig.jobTypes.join(","));
  if (searchConfig.workplaceTypes.length) params.set("f_WT", searchConfig.workplaceTypes.join(","));
  params.set("start", String(start));
  return `${BASE_URL}?${params.toString()}`;
}

function randomDelay(minMs, maxMs) {
  const ms = minMs + Math.random() * (maxMs - minMs);
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isTitleRelevant(title) {
  return !SKIP_TITLE_RE.test(title);
}

// Extracts the numeric job ID from a LinkedIn job URL — used as the canonical
// dedup key because the same job can appear with slightly different URL paths
// across different keyword/location searches.
function extractJobId(url) {
  const m = url.split("?")[0].match(/-(\d+)\/?$/);
  return m ? m[1] : null;
}

async function scrapeOneCombination(page, keyword, location, geoId, seen, maxResults) {
  const results = [];
  // Track IDs seen within this combination across pages (seen only has IDs from
  // previous combinations at this point).
  const localIds = new Set();
  let start = 0;

  while (seen.size + results.length < maxResults) {
    const url = buildSearchUrl(keyword, location, geoId, start);
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });
    const selectorFound = await page
      .waitForSelector("ul.jobs-search__results-list li", { timeout: 15000 })
      .then(() => true).catch(() => false);

    if (!selectorFound && start === 0 && results.length === 0) {
      const pageTitle = await page.title();
      const htmlPath = require("path").join(__dirname, "..", "debug-linkedin.html");
      const imgPath  = require("path").join(__dirname, "..", "debug-linkedin.png");
      const html = await page.content();
      require("fs").writeFileSync(htmlPath, html);
      await page.screenshot({ path: imgPath, fullPage: false });
      console.warn(`  [debug] Selector not found. Title: "${pageTitle}"`);
      console.warn(`  [debug] HTML → ${htmlPath}`);
      console.warn(`  [debug] Screenshot → ${imgPath}`);
    }

    const pageJobs = await page.evaluate(() => {
      const cards = Array.from(document.querySelectorAll("ul.jobs-search__results-list > li"));
      return cards.map((card) => {
        const titleEl   = card.querySelector("h3.base-search-card__title");
        const companyEl = card.querySelector("h4.base-search-card__subtitle");
        const locationEl = card.querySelector(".job-search-card__location");
        const linkEl    = card.querySelector("a.base-card__full-link");
        const timeEl    = card.querySelector("time");
        return {
          title:    titleEl    ? titleEl.textContent.trim()           : "",
          company:  companyEl  ? companyEl.textContent.trim()         : "",
          location: locationEl ? locationEl.textContent.trim()        : "",
          url:      linkEl     ? linkEl.href.split("?")[0]            : "",
          postedAt: timeEl     ? timeEl.getAttribute("datetime")      : null,
        };
      });
    });

    if (pageJobs.length === 0) break;

    let noUrl = 0, dupes = 0, skippedTitle = 0, kept = 0;
    for (const job of pageJobs) {
      if (!job.url) { noUrl++; continue; }
      const id = extractJobId(job.url);
      if (!id || seen.has(id) || localIds.has(id)) { dupes++; continue; }
      if (!isTitleRelevant(job.title)) {
        skippedTitle++;
        continue;
      }
      localIds.add(id);
      results.push({ ...job, jobId: id });
      kept++;
    }
    if (pageJobs.length > 0) {
      console.log(`    [page start=${start}] found=${pageJobs.length} noUrl=${noUrl} dupes=${dupes} titleFiltered=${skippedTitle} kept=${kept}`);
    }

    start += pageJobs.length;
    await randomDelay(1000, 2000);
  }

  return results;
}

async function scrapeJobs(browser, onProgress) {
  const keywords = Array.isArray(searchConfig.keywords)
    ? searchConfig.keywords
    : [searchConfig.keywords];
  const locations = Array.isArray(searchConfig.locations) && searchConfig.locations.length
    ? searchConfig.locations
    : [""];
  const geoIds = searchConfig.geoIds || [];

  const all = [];
  const seen = new Set();
  const page = await browser.newPage();
  await page.setUserAgent(
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
  );

  for (const keyword of keywords) {
    for (let li = 0; li < locations.length; li++) {
      const location = locations[li];
      const geoId = geoIds[li] || null;
      if (onProgress) onProgress(`Searching: "${keyword}" in "${location}"…`);

      const batch = await scrapeOneCombination(page, keyword, location, geoId, seen, searchConfig.maxResults);
      for (const job of batch) {
        seen.add(job.jobId); // deduplicate by job ID across keyword/location combos
        all.push(job);
      }

      if (all.length >= searchConfig.maxResults) break;
      await randomDelay(1000, 2000);
    }
    if (all.length >= searchConfig.maxResults) break;
  }

  return all.slice(0, searchConfig.maxResults);
}

module.exports = { scrapeJobs };
