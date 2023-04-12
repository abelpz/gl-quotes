import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "url";
import { dirname } from "path";

import {
  getParsedUSFM,
  getQuoteMatchesInBookRef,
  getTargetQuoteFromWords,
} from "../src/";

// Get the URL of the current module
const __filename = fileURLToPath(import.meta.url);

// Get the directory name of the current module
const __dirname = dirname(__filename);

const tests = [
  {
    params: {
      bookId: "JOS",
      ref: "1:11",
      quote: "בְּ⁠ע֣וֹד׀ שְׁלֹ֣שֶׁת יָמִ֗ים",
    },
    expected: "",
  },
  {
    params: {
      bookId: "JOS",
      ref: "15:7",
      quote:
        "דְּבִרָ⁠ה֮ מֵ⁠עֵ֣מֶק עָכוֹר֒ & הַ⁠גִּלְגָּ֗ל & לְ⁠מַעֲלֵ֣ה אֲדֻמִּ֔ים & מֵי־עֵ֣ין שֶׁ֔מֶשׁ & עֵ֥ין רֹגֵֽל",
    },
    expected:
      "to Debir from the Valley of Trouble, & the Gilgal, & of the ascent of Adummim, & the waters of En Shemesh & En Rogel",
  },
  {
    params: {
      bookId: "JOS",
      ref: "15:7",
      quote:
        "דְּבִרָ⁠ה֮ מֵ⁠עֵ֣מֶק עָכוֹר֒ & הַ⁠גִּלְגָּ֗ל & לְ⁠מַעֲלֵ֣ה אֲדֻמִּ֔ים & מֵי־עֵ֣ין שֶׁ֔מֶ & עֵ֥ין רֹגֵֽל",
    },
    expected: "",
  },
  {
    params: {
      bookId: "PHP",
      ref: "1:1-20",
      quote: "τινὲς μὲν καὶ & τὸν Χριστὸν κηρύσσουσιν",
    },
    expected: "Some indeed even proclaim Christ",
  },
  {
    params: {
      bookId: "GEN",
      ref: "2:23",
      quote: "עֶ֚צֶם מֵֽ⁠עֲצָמַ֔⁠י וּ⁠בָשָׂ֖ר מִ⁠בְּשָׂרִ֑⁠י",
    },
    expected: "is} bone from my bones\nand flesh from my flesh",
  },
  {
    params: {
      bookId: "GEN",
      ref: "4:23",
      quote: "כִּ֣י אִ֤ישׁ הָרַ֨גְתִּי֙ לְ⁠פִצְעִ֔⁠י וְ⁠יֶ֖לֶד לְ⁠חַבֻּרָתִֽ⁠י",
    },
    expected:
      "For I killed a man for my wound,\neven a young man for my bruise",
  },
];

tests.forEach(({ params, expected }) => {
  const { bookId, ref, quote } = params;

  const targetUsfm = fs.readFileSync(
    path.join(__dirname, "../examples/data/", `${bookId}-target.usfm`),
    "utf8"
  );

  const sourceUsfm = fs.readFileSync(
    path.join(__dirname, "../examples/data/", `${bookId}-source.usfm`),
    "utf8"
  );

  const sourceBook = getParsedUSFM(sourceUsfm).chapters;
  const quoteMatches = getQuoteMatchesInBookRef({
    quote,
    ref,
    bookObject: sourceBook,
    isOrigLang: true,
    occurrence: -1,
  });
  const targetBook = getParsedUSFM(targetUsfm).chapters;

  const targetQuotes = getTargetQuoteFromWords({
    targetBook,
    wordsMap: quoteMatches,
  });

  if (targetQuotes !== expected)
    console.error("Quote not found in", bookId, ref);
});
