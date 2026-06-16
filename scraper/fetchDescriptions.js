const CONCURRENCY = 3;   // parallel browser pages fetching descriptions simultaneously
const DELAY_MS    = 400;  // delay between fetches per page

function delay(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function stripHtml(html) {
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

async function fetchOneDescription(page, jobId) {
  try {
    const html = await page.evaluate(async (url) => {
      const res = await fetch(url);
      if (!res.ok) return "";
      return res.text();
    }, `https://www.linkedin.com/jobs-guest/jobs/api/jobPosting/${jobId}`);
    return stripHtml(html);
  } catch {
    return "";
  }
}

async function warmUpPage(browser) {
  const page = await browser.newPage();
  await page.setUserAgent(
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
  );
  await page.goto("https://www.linkedin.com/jobs", {
    waitUntil: "domcontentloaded",
    timeout: 30000,
  }).catch(() => null);
  return page;
}

async function fetchDescriptions(browser, jobs, onProgress) {
  // Open CONCURRENCY pages in parallel for the warm-up
  const pages = await Promise.all(
    Array.from({ length: CONCURRENCY }, () => warmUpPage(browser))
  );

  const total = jobs.length;
  let completed = 0;
  const results = new Array(total);

  // Each worker pulls from a shared queue, keeping all pages busy
  const queue = jobs.map((job, idx) => ({ job, idx }));

  async function worker(page) {
    while (queue.length > 0) {
      const { job, idx } = queue.shift();
      completed++;
      if (onProgress) onProgress(`Fetching description ${completed}/${total}: ${job.title}`);

      const jobId = job.jobId || job.url?.match(/\/(\d+)\/?$/)?.[1];
      const description = jobId ? await fetchOneDescription(page, jobId) : "";
      results[idx] = { ...job, description };
      await delay(DELAY_MS);
    }
  }

  await Promise.all(pages.map((page) => worker(page)));
  await Promise.all(pages.map((page) => page.close()));

  return results;
}

module.exports = { fetchDescriptions };
