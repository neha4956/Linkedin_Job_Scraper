import { useEffect, useRef, useState, useCallback } from "react";
import "./App.css";

function formatDate(value) {
  if (!value) return "Unknown";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function App() {
  const [data, setData] = useState(null);
  const [fetchError, setFetchError] = useState(null);
  const [scrapeState, setScrapeState] = useState("idle"); // idle | running | done | error
  const [scrapeError, setScrapeError] = useState(null);
  const [logs, setLogs] = useState([]);
  const logEndRef = useRef(null);

  const loadJobs = useCallback(() => {
    setFetchError(null);
    return fetch("/api/jobs")
      .then((res) => res.json())
      .then(setData)
      .catch((err) => setFetchError(err.message));
  }, []);

  useEffect(() => {
    loadJobs();
  }, [loadJobs]);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  async function runScraper() {
    setScrapeState("running");
    setScrapeError(null);
    setLogs([]);
    try {
      const res = await fetch("/api/scrape", { method: "POST" });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `Server error ${res.status}`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const parts = buf.split("\n\n");
        buf = parts.pop();
        for (const part of parts) {
          const line = part.replace(/^data: /, "").trim();
          if (!line) continue;
          if (line.startsWith("__DONE__:error:")) {
            throw new Error(line.slice("__DONE__:error:".length));
          }
          if (line === "__DONE__:ok") {
            await loadJobs();
            setScrapeState("done");
            return;
          }
          setLogs((prev) => [...prev, line]);
        }
      }
    } catch (err) {
      setScrapeError(err.message);
      setScrapeState("error");
    }
  }

  const { generatedAt, totalScraped, totalMatched, jobs } = data ?? {};

  return (
    <div className="page">
      <header className="header">
        <div className="header__top">
          <div>
            <h1>LinkedIn Job Matches</h1>
            <p className="meta">
              {generatedAt
                ? `Last updated ${formatDate(generatedAt)}`
                : "No scrape run yet"}
              {totalScraped != null && ` · ${totalMatched} matched / ${totalScraped} scraped`}
            </p>
          </div>
          <button
            className={`scrape-btn scrape-btn--${scrapeState}`}
            onClick={runScraper}
            disabled={scrapeState === "running"}
          >
            {scrapeState === "running" ? (
              <><span className="spinner" /> Scraping…</>
            ) : scrapeState === "done" ? (
              "✓ Done — Run Again"
            ) : (
              "Run Scraper"
            )}
          </button>
        </div>
        {scrapeError && <p className="scrape-error">{scrapeError}</p>}
      </header>

      {logs.length > 0 && (
        <div className="log-console">
          {logs.map((line, i) => (
            <div key={i} className={`log-line${line.startsWith("[err]") ? " log-line--err" : ""}`}>
              {line}
            </div>
          ))}
          <div ref={logEndRef} />
        </div>
      )}

      {fetchError ? (
        <div className="status">Failed to load jobs: {fetchError}</div>
      ) : !data ? (
        <div className="status">Loading…</div>
      ) : jobs.length === 0 ? (
        <div className="status">
          No matching jobs yet. Click <strong>Run Scraper</strong> to fetch today's matches.
        </div>
      ) : (
        <ul className="job-list">
          {jobs.map((job) => (
            <li key={job.url} className="job-card">
              <div className="job-card__main">
                <h2 className="job-card__title">{job.title}</h2>
                <p className="job-card__company">
                  {job.company} · {job.location}
                </p>
                <p className="job-card__posted">Posted: {formatDate(job.postedAt)}</p>
                {job.matchedSkills?.length > 0 && (
                  <ul className="job-card__skills">
                    {job.matchedSkills.map((skill) => (
                      <li key={skill}>{skill}</li>
                    ))}
                  </ul>
                )}
              </div>
              <div className="job-card__side">
                <span className="job-card__score">{job.score}</span>
                <a
                  className="job-card__apply"
                  href={job.url}
                  target="_blank"
                  rel="noreferrer"
                >
                  View on LinkedIn
                </a>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
