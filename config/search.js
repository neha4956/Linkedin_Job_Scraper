// Configurable LinkedIn job search parameters.
// Edit these values to change what the daily scraper looks for.
// The scraper builds a guest LinkedIn job-search URL from these fields
// (no login required), so changes here take effect on the next scheduled run.

module.exports = {
  // Free-text search keywords (matches LinkedIn's "Search by title, skill, or company" box)
  keywords: "Software Engineer",

  // Location string as you'd type it into LinkedIn's location box
  location: "Bengaluru, Karnataka, India",

  // LinkedIn geoId for the location above (optional, speeds up/locks the location match).
  // Leave null to let LinkedIn resolve the location string instead.
  geoId: null,

  // How recently the job must have been posted, in seconds.
  // 86400 = last 24 hours (matches LinkedIn's f_TPR=r86400 filter)
  postedWithinSeconds: 86400,

  // LinkedIn experience level filter codes (f_E). Leave empty array for "any".
  // 1 = Internship, 2 = Entry level, 3 = Associate, 4 = Mid-Senior, 5 = Director, 6 = Executive
  experienceLevels: [],

  // LinkedIn job type filter codes (f_JT). Leave empty array for "any".
  // F = Full-time, P = Part-time, C = Contract, T = Temporary, I = Internship
  jobTypes: [],

  // LinkedIn remote/on-site filter codes (f_WT). Leave empty array for "any".
  // 1 = On-site, 2 = Remote, 3 = Hybrid
  workplaceTypes: [],

  // Max number of job cards to scrape per run
  maxResults: 50,
};
