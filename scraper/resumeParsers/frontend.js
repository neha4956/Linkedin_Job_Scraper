// Frontend developer resume parser.
// Classifies Technical Skills section by category:
//   - Languages + Frontend → mustHave if the skill appears ≥2× in experience body
//   - Too-generic terms (JS, TS, HTML) → always niceToHave (appear in every job)
//   - Backend / DevOps / DB / Testing → niceToHave
//   - Tools / Coursework → skipped

const PRIMARY_CATEGORIES  = ["languages", "frontend"];
const SKIP_CATEGORIES     = ["tools", "coursework", "education", "hands on"];
const SKIP_TERMS          = new Set(["git", "postman", "data structure", "algorithms",
                                     "oop", "cs fundamentals", "programming principles", "c++"]);

// Too generic to be a mustHave filter — every frontend job mentions these,
// so they'd let everything through. They stay as niceToHave score boosters.
const TOO_GENERIC = new Set(["javascript", "typescript", "html", "html5", "css", "c++"]);

// Terms that should NOT be split on "/" (keep as one unit)
const NO_SPLIT = new Set(["ci/cd", "html/css", "c/c++"]);

const CANONICAL = {
  reactjs:            "React",
  "react.js":         "React",
  nextjs:             "Next.js",
  "next.js":          "Next.js",
  nodejs:             "Node",
  "node.js":          "Node",
  expressjs:          "Express",
  "tailwind css":     "Tailwind",
  "restful apis":     "REST",
  microfrontend:      "Microfrontend",
  html5:              "HTML",
  rtl:                "Testing Library",
};

function normalize(raw) {
  const t = raw.trim();
  return CANONICAL[t.toLowerCase()] ?? t;
}

// Splits "Redux/Jotai" → ["Redux","Jotai"],
//        "Module Federation (Microfrontend)" → ["Module Federation","Microfrontend"],
//        "CI/CD" stays whole.
function splitAndNormalize(str) {
  const out = new Set();
  for (const chunk of str.split(",").map((s) => s.trim()).filter(Boolean)) {
    if (SKIP_TERMS.has(chunk.toLowerCase())) continue;

    const paren = chunk.match(/^(.+?)\s*\((.+?)\)\s*(.*)$/);
    if (paren) {
      for (const t of splitAndNormalize(`${paren[1]},${paren[2]}`)) out.add(t);
      continue;
    }

    if (chunk.includes("/") && !NO_SPLIT.has(chunk.toLowerCase())) {
      for (const part of chunk.split("/")) {
        const n = normalize(part.trim());
        if (n && !SKIP_TERMS.has(n.toLowerCase())) out.add(n);
      }
      continue;
    }

    const n = normalize(chunk);
    if (n) out.add(n);
  }
  return [...out];
}

// Count how many times a skill's root word appears in the experience text.
// Uses the first token so "React" catches "ReactJS", "Next.js" catches "NextJS".
function countInExperience(term, expText) {
  const root = term.toLowerCase().split(/[.\s-]/)[0];
  let n = 0, pos = 0;
  while ((pos = expText.indexOf(root, pos)) !== -1) { n++; pos += root.length; }
  return n;
}

function parseSkillsFromText(fullText) {
  const marker = "Technical Skills";
  const idx = fullText.indexOf(marker);
  if (idx === -1) return null;

  const sectionMatch = fullText.slice(idx).match(
    /Technical Skills\s*\n([\s\S]*?)(?:\n(?:Education|Experience|Projects|Certifications|Awards|References))/i
  );
  if (!sectionMatch) return null;

  const sectionText   = sectionMatch[1];
  const experienceText = fullText.slice(0, idx).toLowerCase();

  const mustHave   = new Set();
  const niceToHave = new Set();

  for (const line of sectionText.split("\n")) {
    const colonIdx = line.indexOf(":");
    if (colonIdx === -1) continue;
    const category  = line.slice(0, colonIdx).trim().toLowerCase();
    const skillsStr = line.slice(colonIdx + 1).trim();
    if (!skillsStr) continue;
    if (SKIP_CATEGORIES.some((s) => category.includes(s))) continue;

    const isPrimary = PRIMARY_CATEGORIES.some((s) => category.includes(s));
    for (const term of splitAndNormalize(skillsStr)) {
      if (SKIP_TERMS.has(term.toLowerCase())) continue;
      const isGeneric = TOO_GENERIC.has(term.toLowerCase());

      if (isPrimary && !isGeneric) {
        const freq = countInExperience(term, experienceText);
        (freq >= 2 ? mustHave : niceToHave).add(term);
      } else {
        // Generic primary terms + all secondary → niceToHave
        niceToHave.add(term);
      }
    }
  }

  // niceToHave must not duplicate mustHave
  for (const s of mustHave) niceToHave.delete(s);

  return {
    mustHave:   [...mustHave],
    niceToHave: [...niceToHave],
  };
}

module.exports = { parseSkillsFromText };
