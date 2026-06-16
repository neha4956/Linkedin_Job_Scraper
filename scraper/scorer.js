// Scoring weights — title matches count double because a skill in the job
// title is a much stronger signal than one buried in the description.
const WEIGHTS = {
  mustHave:   { title: 20, desc: 10 },
  niceToHave: { title:  6, desc:  3 },
};

// Extracts { min, max } YOE from a job description. max=Infinity means "X+ years".
// Returns null if no YOE requirement is found.
function parseYoeRange(text) {
  const t = text.toLowerCase();

  // "3-5 years", "3 to 5 years", "3–5 years"
  let m = t.match(/(\d+)\s*(?:-|–|to)\s*(\d+)\s*\+?\s*years?\s+(?:of\s+)?(?:relevant\s+)?(?:work\s+)?exp/);
  if (m) return { min: +m[1], max: +m[2] };

  // "3+ years of experience"
  m = t.match(/(\d+)\s*\+\s*years?\s+(?:of\s+)?(?:relevant\s+)?(?:work\s+)?exp/);
  if (m) return { min: +m[1], max: Infinity };

  // "minimum 3 years" / "at least 3 years"
  m = t.match(/(?:minimum|at\s+least|min\.?)\s+(\d+)\s*\+?\s*years?\s+(?:of\s+)?(?:relevant\s+)?(?:work\s+)?exp/);
  if (m) return { min: +m[1], max: Infinity };

  // "experience of 3+ years" / "experience of 3-5 years"
  m = t.match(/exp(?:erience)?\s+of\s+(\d+)\s*(?:\+|(?:-|–|to)\s*(\d+))?\s*years?/);
  if (m) return { min: +m[1], max: m[2] ? +m[2] : Infinity };

  // "3 years of experience" (plain single number, least specific — try last)
  m = t.match(/(\d+)\s*years?\s+(?:of\s+)?(?:relevant\s+)?(?:work\s+)?exp/);
  if (m) return { min: +m[1], max: Infinity };

  return null;
}

function scoreJob(job, profile) {
  const titleText = `${job.title} ${job.company}`.toLowerCase();
  const descText  = (job.description || "").toLowerCase();

  // Exclude filter runs on title only (fast, avoids false positives from desc).
  for (const term of profile.exclude || []) {
    if (titleText.includes(term.toLowerCase())) {
      return { score: 0, matchedSkills: [], excluded: true };
    }
  }

  // YOE filter — only applied when the description mentions a requirement.
  const yoe = profile.yearsOfExperience;
  if (yoe != null) {
    const yoeRange = parseYoeRange(descText);
    if (yoeRange) {
      // Too senior: job wants e.g. 7+ years, candidate has 4
      if (yoeRange.min > yoe + 2) {
        return { score: 0, matchedSkills: [], excluded: true };
      }
      // Too junior: job caps at e.g. 1 year, candidate has 4
      if (yoeRange.max !== Infinity && yoeRange.max < yoe - 1) {
        return { score: 0, matchedSkills: [], excluded: true };
      }
    }
  }

  const matchedSkills = [];
  let score = 0;

  function matchTerm(term, weights) {
    const t = term.toLowerCase();
    const inTitle = titleText.includes(t);
    const inDesc  = !inTitle && descText.includes(t);
    if (inTitle || inDesc) {
      matchedSkills.push(term);
      score += inTitle ? weights.title : weights.desc;
      return true;
    }
    return false;
  }

  const mustHave = profile.mustHave || [];
  let mustHaveHit = false;
  for (const term of mustHave) {
    if (matchTerm(term, WEIGHTS.mustHave)) mustHaveHit = true;
  }

  // If mustHave list is non-empty and nothing matched, job is irrelevant.
  if (mustHave.length > 0 && !mustHaveHit) {
    return { score: 0, matchedSkills: [], excluded: false };
  }

  for (const term of profile.niceToHave || []) {
    matchTerm(term, WEIGHTS.niceToHave);
  }

  return { score, matchedSkills, excluded: false };
}

module.exports = { scoreJob };
