import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "url";
import { dirname } from "path";
import {
  getQuoteMatchesInBookRef,
  getTargetQuoteFromWords,
} from "../src/helpers/quote";
import { getParsedUSFM } from "../src/helpers/scripture";

// Get the URL of the current module
const __filename = fileURLToPath(import.meta.url);

// Get the directory name of the current module
const __dirname = dirname(__filename);

const targetUsfm = fs.readFileSync(
  path.join(__dirname, "../examples/data/", "aligned-2JN.usfm"),
  "utf8"
);

const sourceUsfm = fs.readFileSync(
  path.join(__dirname, "../examples/data/", "orig-2JN.usfm"),
  "utf8"
);

const sourceBook = getParsedUSFM(sourceUsfm).chapters;
const quoteMatches = getQuoteMatchesInBookRef({
  quote: "καὶ & ἐγὼ",
  ref: "1:1-13",
  bookObject: sourceBook,
  isOrigLang: true,
  occurrence: -1,
});
const targetBook = getParsedUSFM(targetUsfm).chapters;
const targetQuotes = getTargetQuoteFromWords({
  targetBook,
  wordsMap: quoteMatches,
});

console.log(targetQuotes);
