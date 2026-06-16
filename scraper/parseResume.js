// Resume parser driver.
// Loads the right parser based on `parserType` and returns a unified profile:
//   { mustHave, niceToHave, exclude }
//
// To add a new parser: drop a file in resumeParsers/<type>.js that exports
// { parseSkillsFromText(fullText) → { mustHave, niceToHave } }
// then pass parserType: "<type>" in the call below.

const pdfParse = require("pdf-parse");
const fs       = require("fs");
const path     = require("path");

// Title-level excludes are role-agnostic and live here, not in individual parsers.
const TITLE_EXCLUDES = [
  "Android", "iOS", "Flutter", "QA Automation", "Data Engineer",
  "Machine Learning", "Data Scientist", "Senior Staff", "Principal",
  "Director", "Embedded", "SAP",
];

async function parseResume(resumePath, parserType = "frontend") {
  const parserPath = path.join(__dirname, "resumeParsers", `${parserType}.js`);
  if (!fs.existsSync(parserPath)) {
    throw new Error(`No resume parser found for type "${parserType}". Expected: ${parserPath}`);
  }

  const { parseSkillsFromText } = require(parserPath);
  const buffer = fs.readFileSync(resumePath);
  const { text } = await pdfParse(buffer);

  const result = parseSkillsFromText(text);
  if (!result) return null;

  return {
    mustHave:   result.mustHave,
    niceToHave: result.niceToHave,
    exclude:    TITLE_EXCLUDES,
  };
}

module.exports = { parseResume };
