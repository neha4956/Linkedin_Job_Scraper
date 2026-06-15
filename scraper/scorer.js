const MUST_HAVE_POINTS = 10;
const NICE_TO_HAVE_POINTS = 3;

// Scores a job against the profile using case-insensitive keyword matching
// against the job title and company name (LinkedIn's guest search results
// don't expose the full description without extra per-job requests).
function scoreJob(job, profile) {
  const text = `${job.title} ${job.company}`.toLowerCase();

  for (const term of profile.exclude || []) {
    if (text.includes(term.toLowerCase())) {
      return { score: 0, matchedSkills: [], excluded: true };
    }
  }

  const matchedSkills = [];
  let score = 0;

  const mustHave = profile.mustHave || [];
  for (const term of mustHave) {
    if (text.includes(term.toLowerCase())) {
      matchedSkills.push(term);
      score += MUST_HAVE_POINTS;
    }
  }

  if (mustHave.length > 0 && matchedSkills.length === 0) {
    return { score: 0, matchedSkills: [], excluded: false };
  }

  for (const term of profile.niceToHave || []) {
    if (text.includes(term.toLowerCase())) {
      matchedSkills.push(term);
      score += NICE_TO_HAVE_POINTS;
    }
  }

  return { score, matchedSkills, excluded: false };
}

module.exports = { scoreJob };
