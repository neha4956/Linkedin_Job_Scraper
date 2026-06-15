const puppeteer = require("puppeteer");
const searchConfig = require("../config/search");

const BASE_URL = "https://www.linkedin.com/jobs/search";
const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

function buildSearchUrl(start = 0) {
  const params = new URLSearchParams();
  params.set("keywords", searchConfig.keywords);
  params.set("location", searchConfig.location);
  if (searchConfig.geoId) params.set("geoId", searchConfig.geoId);
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

async function scrapeJobs() {
  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  const jobs = [];

  try {
    const page = await browser.newPage();
    await page.setUserAgent(USER_AGENT);

    let start = 0;
    while (jobs.length < searchConfig.maxResults) {
      const url = buildSearchUrl(start);
      await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });
      await page
        .waitForSelector("ul.jobs-search__results-list li", { timeout: 15000 })
        .catch(() => null);

      const pageJobs = await page.evaluate(() => {
        const cards = Array.from(document.querySelectorAll("ul.jobs-search__results-list > li"));
        return cards.map((card) => {
          const titleEl = card.querySelector("h3.base-search-card__title");
          const companyEl = card.querySelector("h4.base-search-card__subtitle");
          const locationEl = card.querySelector(".job-search-card__location");
          const linkEl = card.querySelector("a.base-card__full-link");
          const timeEl = card.querySelector("time");
          return {
            title: titleEl ? titleEl.textContent.trim() : "",
            company: companyEl ? companyEl.textContent.trim() : "",
            location: locationEl ? locationEl.textContent.trim() : "",
            url: linkEl ? linkEl.href.split("?")[0] : "",
            postedAt: timeEl ? timeEl.getAttribute("datetime") : null,
          };
        });
      });

      if (pageJobs.length === 0) break;

      jobs.push(...pageJobs);
      start += pageJobs.length;

      // Polite delay between paginated requests to keep this low-risk.
      await randomDelay(2000, 4000);
    }
  } finally {
    await browser.close();
  }

  const seen = new Set();
  return jobs
    .filter((job) => job.url && !seen.has(job.url) && seen.add(job.url))
    .slice(0, searchConfig.maxResults);
}

module.exports = { scrapeJobs, buildSearchUrl };
