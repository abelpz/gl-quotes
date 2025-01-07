import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "url";
import { dirname } from "path";
import fetch from "node-fetch";
import { getParsedUSFM } from "../src";

// Get the URL of the current module
const __filename = fileURLToPath(import.meta.url);
// Get the directory name of the current module
const __dirname = dirname(__filename);

const bookNames = {
  GEN: 1,
  EXO: 2,
  LEV: 3,
  NUM: 4,
  DEU: 5,
  JOS: 6,
  JDG: 7,
  RUT: 8,
  "1SA": 9,
  "2SA": 10,
  "1KI": 11,
  "2KI": 12,
  "1CH": 13,
  "2CH": 14,
  EZR: 15,
  NEH: 16,
  EST: 17,
  JOB: 18,
  PSA: 19,
  PRO: 20,
  ECC: 21,
  SNG: 22,
  ISA: 23,
  JER: 24,
  LAM: 25,
  EZK: 26,
  DAN: 27,
  HOS: 28,
  JOL: 29,
  AMO: 30,
  OBA: 31,
  JON: 32,
  MIC: 33,
  NAM: 34,
  HAB: 35,
  ZEP: 36,
  HAG: 37,
  ZEC: 38,
  MAL: 39,
  MAT: 41,
  MRK: 42,
  LUK: 43,
  JHN: 44,
  ACT: 45,
  ROM: 46,
  "1CO": 47,
  "2CO": 48,
  GAL: 49,
  EPH: 50,
  PHP: 51,
  COL: 52,
  "1TH": 53,
  "2TH": 54,
  "1TI": 55,
  "2TI": 56,
  TIT: 57,
  PHM: 58,
  HEB: 59,
  JAS: 60,
  "1PE": 61,
  "2PE": 62,
  "1JN": 63,
  "2JN": 64,
  "3JN": 65,
  JUD: 66,
  REV: 67,
};
const targetBooks = {};
const sourceBooks = {};
export async function getTargetBook(_bookId, shouldFetch = false) {

  const bookId = _bookId.toUpperCase();
  if (targetBooks[bookId])
    return targetBooks[bookId];

  const targetUsfm = !shouldFetch
    ? fs.readFileSync(
        path.join(__dirname, "../examples/data/", `${bookId}-target.usfm`),
        "utf8"
      )
    : await fetch(
        `https://git.door43.org/api/v1/repos/unfoldingword/en_ult/releases/latest?pre-release=false`
      )
        .then((r) => r.json())
        .then(
          async ({ tag_name: tag }) =>
            await fetch(
              `https://git.door43.org/unfoldingWord/en_ult/raw/tag/${tag}/${String(
                bookNames[bookId]
              ).padStart(2, "0")}-${bookId}.usfm`
            ).then((r) => r.text())
        );
  
  const targetBook = getParsedUSFM(targetUsfm).chapters;
  targetBooks[bookId] = targetBook;
  return targetBook;
}
export async function getSourceBook(_bookId, shouldFetch = false) {
  const bookId = _bookId.toUpperCase();
  if (sourceBooks[bookId])
    return sourceBooks[bookId];

  const sourceUsfm = !shouldFetch
    ? fs.readFileSync(
      path.join(__dirname, "../examples/data/", `${bookId}-source.usfm`),
      "utf8"
    )
    : await fetch(
      `https://git.door43.org/unfoldingWord/${bookNames[bookId] < 40 ? "hbo_uhb" : "el-x-koine_ugnt"}/raw/branch/master/${String(bookNames[bookId]).padStart(
        2,
        "0"
      )}-${bookId}.usfm`
    ).then((r) => r.text());
  const sourceBook = getParsedUSFM(sourceUsfm).chapters;
  sourceBooks[bookId] = sourceBook;
  return sourceBook;
}
