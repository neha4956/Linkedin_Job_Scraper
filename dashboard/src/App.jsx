import { useEffect, useState } from "react";
import "./App.css";

function formatPostedAt(value) {
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

function App() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch("/jobs.json")
      .then((res) => res.json())
      .then(setData)
      .catch((err) => setError(err.message));
  }, []);

  if (error) {
    return <div className="status">Failed to load jobs.json: {error}</div>;
  }

  if (!data) {
    return <div className="status">Loading...</div>;
  }

  const { generatedAt, totalScraped, totalMatched, jobs } = data;

  return (
    <div className="page">
      <header className="header">
        <h1>LinkedIn Job Matches</h1>
        <p className="meta">
          {generatedAt ? `Last updated ${formatPostedAt(generatedAt)}` : "No scrape run yet"}
          {" · "}
          {totalMatched} matched / {totalScraped} scraped
        </p>
      </header>

      {jobs.length === 0 ? (
        <div className="status">No matching jobs yet. Run the scraper to populate data/jobs.json.</div>
      ) : (
        <ul className="job-list">
          {jobs.map((job) => (
            <li key={job.url} className="job-card">
              <div className="job-card__main">
                <h2 className="job-card__title">{job.title}</h2>
                <p className="job-card__company">
                  {job.company} · {job.location}
                </p>
                <p className="job-card__posted">Posted: {formatPostedAt(job.postedAt)}</p>
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
                <a className="job-card__apply" href={job.url} target="_blank" rel="noreferrer">
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

export default App;
