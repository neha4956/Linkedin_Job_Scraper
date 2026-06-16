// Configurable LinkedIn job search parameters.
// The scraper runs every combination of keywords × locations and deduplicates.

const path = require("path");

module.exports = {
  // Path to your resume PDF (relative to project root).
  // The scraper parses it on every run — swap the file here when your resume changes.
  resumePath: path.join(__dirname, "..", "resume", "Resume_Neha_Kumari_4_YRS_1.pdf"),

  // Which parser to use for the resume. Matches a file in scraper/resumeParsers/<type>.js
  // Current options: "frontend"  (add more by creating new parser files)
  resumeParserType: "frontend",

  // Your total years of professional experience.
  // Jobs requiring more than yoe+2 years (too senior) or
  // capping at less than yoe-1 years (too junior) are excluded.
  yearsOfExperience: 4,

  // Each keyword is searched separately (add as many as you want)
  keywords: [
    "Software Engineer",
    "SDE-2 UI",
    "Sr. Software Engineer",
    "Senior Software Engineer - UI",
    "React Engineer",
    "React Developer",
    "UI Developer"
  ],

  // Each location is searched for every keyword above.
  // Use full city+state names — avoid duplicating the same city in short and long form.
  locations: [
    "Bengaluru, Karnataka, India",
    "Noida, Uttar Pradesh, India",
    "Hyderabad, Telangana, India",
    "Pune, Maharashtra, India",
    "Gurugram, Haryana, India"
  ],

  // LinkedIn geoId for each location (optional, leave null to skip).
  // If provided, must match the order of locations above.
  geoIds: [],

  // How recently the job must have been posted, in seconds.
  // 86400 = last 24 hours
  postedWithinSeconds: 86400,

  // LinkedIn experience level filter codes (f_E). Leave empty array for "any".
  // 1 = Internship, 2 = Entry level, 3 = Associate, 4 = Mid-Senior, 5 = Director, 6 = Executive
  experienceLevels: [3, 4],

  // LinkedIn job type filter codes (f_JT). Leave empty array for "any".
  // F = Full-time, P = Part-time, C = Contract, T = Temporary, I = Internship
  jobTypes: ["F"],

  // LinkedIn remote/on-site filter codes (f_WT). Leave empty array for "any".
  // 1 = On-site, 2 = Remote, 3 = Hybrid
  workplaceTypes: [3],

  // Max total unique jobs to collect across all keyword+location combinations
  maxResults: 500,
};
