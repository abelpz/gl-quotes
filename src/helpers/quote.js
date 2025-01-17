import { tokenize, tokenizeOrigLang } from "string-punctuation-tokenizer";
import { DEFAULT_SEPARATOR, QUOTE_ELLIPSIS } from "../utils/consts";
import { refToString, setBook, verseObjectsToString } from "./scripture";
import { doesReferenceContain } from "bible-reference-range";
import XRegExp from "xregexp";

export function cleanQuoteString(quote) {
  return (
    quote
      // replace smart closing quotation mark with correct one
      .replace(/”/gi, '"')
      // remove space before smart opening quotation mark
      .replace(/“ /gi, '"')
      // replace smart opening quotation mark with correct one
      .replace(/“/gi, '"')
      // add space after
      .replace(/,"/gi, ', "')
      // remove space after opening quotation mark
      .replace(/, " /gi, ', "')
      // remove spaces before question marks
      .replace(/\s+([?])/gi, "$1")
      // remove double spaces
      .replace(/ {2}/gi, " ")
      // remove spaces before commas
      .replace(/ , /gi, ", ")
      // remove spaces before periods
      .replace(/ ."/gi, '."')
      // remove space before apostrophes
      .replace(/ ’./gi, "’.")
      .trim()
      .replace(/ *\.{3} */g, ` ${QUOTE_ELLIPSIS} `)
      .replace(/ *… */gi, ` ${QUOTE_ELLIPSIS} `)
      .replaceAll(/\\n|\\r/g, "")
  );
}

export function tokenizer(quote, isOrigLang = false) {
  if (isOrigLang) {
    return tokenizeOrigLang({
      text: quote,
      includePunctuation: false,
      normalize: true,
    });
  } else {
    return tokenize({
      text: quote,
      includePunctuation: false,
      normalize: true,
    });
  }
}

export function tokenizeQuote(quote, isOrigLang = true) {
  const cleanQuote = cleanQuoteString(quote);
  const quotesArray = cleanQuote
    .split(/\s?&\s?/)
    .flatMap((partialQuote) => tokenizer(partialQuote, isOrigLang).concat("&"))
    .slice(0, -1);
  return quotesArray;
}

export function normalize(str = "", isOrigLang = false) {
  const tokens = tokenizeQuote(str, isOrigLang).join(" ").trim();
  return tokens;
}

/**
 * @description generates the target quote from a source quote reference.
 * @param {chapter} targetBook - book to generate the quotes from,
 * @param {object} sourceWordData - the reference for the source quote to match
 * @param {number} sourceWordData.chapter - the chapter where the source qote is
 * @param {number} sourceWordData.verse - the verse where the source quote is
 * @param {string} sourceWordData.quote - the actual quote in the source language
 * @param {number} sourceWordData.occurrence - the occurrence of the source quote
 */

export function getTargetQuotesFromOrigWords({
  verseObjects,
  wordObjects,
  isMatch,
}) {
  let text = "";

  if (!verseObjects || !wordObjects) {
    return text;
  }

  let separator = DEFAULT_SEPARATOR;
  let needsEllipsis = false;

  for (let i = 0, l = verseObjects.length; i < l; i++) {
    const verseObject = verseObjects[i];
    let lastMatch = false;

    if (
      verseObject.type === "milestone" ||
      verseObject.type === "word" ||
      verseObject.type === "quote"
    ) {
      // It is a milestone or a word...we want to handle all of them.
      if (
        isMatch ||
        wordObjects.find((item) => {
          return (
            normalize(verseObject.content) === normalize(item.text) &&
            verseObject.occurrence === item.occurrence
          );
        })
      ) {
        lastMatch = true;

        // We have a match (or previously had a match in the parent) so we want to include all text that we find,
        if (needsEllipsis) {
          // Need to add an ellipsis to the separator since a previous match but not one right next to this one
          separator += QUOTE_ELLIPSIS + DEFAULT_SEPARATOR;
          needsEllipsis = false;
        }

        if (text) {
          // There has previously been text, so append the separator, either a space or punctuation
          text += separator;
        }
        separator = DEFAULT_SEPARATOR; // reset the separator for the next word

        if (verseObject.text) {
          // Handle type word, appending the text from this node
          text += verseObject.text;
        }

        if (verseObject.children) {
          // Handle children of type milestone, appending all the text of the children, isMatch is true
          text += getTargetQuotesFromOrigWords({
            wordObjects,
            verseObjects: verseObject.children,
            isMatch: true,
          });
        }
      } else if (verseObject.children) {
        // Did not find a match, yet still need to go through all the children and see if there's match.
        // If there isn't a match here, i.e. childText is empty, and we have text, we still need
        // an ellipsis if a later match is found since there was some text here
        let childText = getTargetQuotesFromOrigWords({
          wordObjects,
          verseObjects: verseObject.children,
          isMatch,
        });

        if (childText) {
          lastMatch = true;

          if (needsEllipsis) {
            separator += QUOTE_ELLIPSIS + DEFAULT_SEPARATOR;
            needsEllipsis = false;
          }
          text += (text ? separator : "") + childText;
          separator = DEFAULT_SEPARATOR;
        } else if (text) {
          needsEllipsis = true;
        }
      }
    }

    if (
      lastMatch &&
      verseObjects[i + 1] &&
      verseObjects[i + 1].type === "text" &&
      text
    ) {
      // Found some text that is a word separator/punctuation, e.g. the apostrophe between "God" and "s" for "God's"
      // We want to preserve this so we can show "God's" instead of "God ... s"
      if (separator === DEFAULT_SEPARATOR) {
        separator = "";
      }
      separator += verseObjects[i + 1].text;
    }
  }
  return text;
}

export function getQuoteMatchesInBookRef({
  quote,
  ref,
  bookObject,
  isOrigLang,
  occurrence = -1,
}) {
  if (occurrence === 0) return new Map();
  const DATA_SEPARATOR = "|";
  const OPEN_CHAR = "{";
  const CLOSE_CHAR = "}";
  const REF_PATTERN = "\\d+:\\d+";
  const OCCURRENCE_PATTERN = "\\d+";
  const enclose = (word) => OPEN_CHAR + word + CLOSE_CHAR;

  const joinWordData = (word, refObject, occurrence) => {
    const { chapter, verse } = refObject;
    const ref = `${chapter}:${verse}`;
    const data = enclose(`${ref}${DATA_SEPARATOR}${occurrence}`);
    return `${word}${data}`;
  };

  const splitWordData = (word) => {
    const [_word, data] = word.split(OPEN_CHAR);
    const [ref, occurrence] = data.slice(0, -1).split(DATA_SEPARATOR);
    const [chapter, verse] = ref.split(":");
    return {
      text: _word,
      chapter: parseInt(chapter),
      verse: parseInt(verse),
      occurrence: parseInt(occurrence),
    };
  };

  const quoteTokens = tokenizeQuote(quote, isOrigLang);

  const book = setBook(bookObject, ref);
  let sourceArray = [];

  //TODO: use this instead of search patterns to get list of found occurrences and avoid using complex regex searches.
  book.forEachVerse((verseObjects, verseRef) => {
    const tokensMap = quoteTokens.reduce((tokensMap, word) => {
      tokensMap.set(normalize(word, true), { count: 0 });
      return tokensMap;
    }, new Map());

    sourceArray.push(
      verseObjectsToString(verseObjects, (word) => {
        const _word = normalize(word, true);
        const quote = tokensMap.get(_word);
        if (!quote) return !_word ? " " : _word;
        quote.count++;
        return joinWordData(_word, verseRef, quote.count);
      })
    );
  });
  const sourceString = sourceArray.join("\n");

  const searchPatterns = quoteTokens.reduce((patterns, token, index) => {
    if (token === QUOTE_ELLIPSIS) return patterns;
    const push =
      (patterns.length === 0) | (quoteTokens[index - 1] === QUOTE_ELLIPSIS);
    const AFTER =
      quoteTokens[index + 1] && quoteTokens[index + 1] === QUOTE_ELLIPSIS
        ? ""
        : `\\s*`;
    const escaped = XRegExp.escape(normalize(token, true));
    const regexp = XRegExp(
      `(${escaped}${enclose(
        `${REF_PATTERN}${XRegExp.escape("|")}${OCCURRENCE_PATTERN}`
      )})${AFTER}`
    );

    if (push) {
      patterns.push(regexp);
      return patterns;
    }

    const current = patterns.length - 1;
    patterns[current] = XRegExp.union([patterns[current], regexp], "g", {
      conjunction: "none",
    });
    return patterns;
  }, []);

  /**
   * SEARCHES FOR ALL OCCURRENCES OF EACH GROUP OF PATTERNS
   * @param {string} source - The source text to search in
   * @param {RegExp[]} patterns - Array of regex patterns to search for
   * @returns {string[][]} Array of matches, where each inner array contains matches for each pattern
   * **/
  const searchQuotesGroups = (source, patterns) => {
    // Keep track of patterns we've already processed
    const processedPatterns = new Set();
    
    const currentMatches = patterns.reduce(
      (currentMatches, regexp, i, patterns) => {
        // Skip if we've already processed this pattern
        if (processedPatterns.has(i)) {
          return currentMatches;
        }
          
        // Find all indexes where this pattern appears
        const patternIndexes = patterns.reduce((indexes, pattern, index) => {
          const currentPattern = regexp.toString();
          const nextPattern = pattern.toString().replace("\\s*", "");
          if (nextPattern === currentPattern) {
            indexes.push(index + 1);
            processedPatterns.add(index);
          }
          return indexes;
        }, []);

        const match = [...source.matchAll(XRegExp.globalize(regexp))];
        if (match.length) {
          return currentMatches.concat(match.map((m, matchIndex) => {
            // Rotate through the pattern indexes for each match
            m.patternIndex = patternIndexes.length ? patternIndexes[matchIndex % patternIndexes.length] : i + 1;
            return m;
          }));
        }
        patterns.length = 0;
        return [];
      },
      []
    );
    currentMatches.sort((a, b) => a.index - b.index);
    
    // Group matches by consecutive patternIndex
    const groupedMatches = currentMatches.reduce((groups, match) => {
      const currentGroup = groups[groups.length - 1] || [];
      
      if (currentGroup.length === 0 || match.patternIndex === currentGroup[currentGroup.length - 1].patternIndex + 1) {
        currentGroup.push(match);
        if (groups.length === 0) groups.push(currentGroup);
      } else {
        groups.push([match]);
      }
      
      return groups;
    }, []);

    // Filter groups that have all consecutive patterns (1 to patterns.length)
    const validGroups = groupedMatches.filter(group => 
      group.length === patterns.length && 
      group[0].patternIndex === 1 && 
      group[group.length - 1].patternIndex === patterns.length
    );

    if (validGroups.length) {
      const result = [];
      validGroups.forEach(group => {
        result.push(group.reduce((acc, match) => {
          acc.concat(match.slice(1));
          return acc.concat(match.slice(1));;
        }, []));
      });
      return result;
    }

    return [];
  };

  //SEARCHES FOR A SPECIFIC OCCURRENCE OF THE FIRST PATTERN, AND THEN FOLLOWING OCCURRENCES OF THE OTHER PATTERNS
  const searchFirstQuoteAndFollowingQuotes = (source, patterns, occurrence) => {
    // Early return for invalid inputs
    if (!source || !patterns.length || occurrence < -1) {
      return [];
    }

    const firstPattern = patterns[0];
    const firstPatternMatches = [];
    let match;
    let startIndex = 0;

    // Only find occurrences up to target + 1 (to establish boundary)
    while ((match = XRegExp.exec(source, firstPattern, startIndex)) !== null) {
      firstPatternMatches.push({
        words: match.slice(1),
        index: match.index,
        endIndex: match.index + match[0].length,
      });
      startIndex = match.index + 1;

      // Stop searching for the first pattern once we've found the occurrence
      if (firstPatternMatches.length === occurrence) break;
    }

    // If we didn't find our target occurrence, return empty array
    if (firstPatternMatches.length < occurrence) {
      return [];
    }

    const firstPatternMatch = firstPatternMatches[occurrence - 1];
    const result = firstPatternMatch.words;

    // Search for subsequent patterns between target occurrence and end of source
    let currentIndex = firstPatternMatch.endIndex;
    const searchBoundary = source.length;

    for (let i = 1; i < patterns.length; i++) {
      // Search for the next pattern in the remaining text, starting from where the last pattern was found
      const nextPatternMatch = XRegExp.exec(
        source.slice(currentIndex, searchBoundary),
        patterns[i],
        0
      );

      // If no match is found, return an empty array
      if (!nextPatternMatch) return [];

      // Add the matched words to the results array
      result.push(...nextPatternMatch.slice(1));

      // Update the current index to the end of the last match
      currentIndex += nextPatternMatch.index + nextPatternMatch[0].length;
    }

    // Create array with empty slots for skipped occurrences,
    // plus one slot for our matching result, this maintains compatibility with the searchQuotesGroups function
    const numberOfSkippedOccurrences = firstPatternMatches.length - 1;
    return Array(numberOfSkippedOccurrences).fill([]).concat([result]);
  };

  const matches =
    occurrence === -1 || searchPatterns.length === 1
      ? searchQuotesGroups(sourceString, searchPatterns)
      : searchFirstQuoteAndFollowingQuotes(
          sourceString,
          searchPatterns,
          occurrence
        );

  const foundOccurrences = matches.reduce((occurrences, words, key) => {
    const currentOccurence = key + 1;
    if (occurrence !== -1 && currentOccurence !== occurrence)
      return occurrences;
    words.forEach((_word) => {
      const { chapter, verse, ...wordObject } = splitWordData(_word);
      const refString = refToString({ chapter, verse });
      const currentWordsInRef = occurrences.get(refString);
      if (currentWordsInRef) currentWordsInRef.push(wordObject);
      else occurrences.set(refString, [wordObject]);
    });
    return occurrences;
  }, new Map());
  return foundOccurrences;
}

export function getTargetQuoteFromWords({ targetBook, wordsMap }) {
  if (!(wordsMap instanceof Map))
    throw new Error("wordsMap should be an instance of Map");
  let quotes = [];
  for (const [ref, wordObjects] of wordsMap) {
    const [chapter, verse] = ref.split(":");
    const targetChapter = targetBook[chapter] ?? {};
    let targetVerse = targetChapter?.[verse];
    if (!targetVerse) {
      const verses = Object.keys(targetChapter).find((verse) => {
        const currentRef = `${chapter}:${verse}`;
        return doesReferenceContain(currentRef, ref);
      });
      targetVerse = targetChapter?.[verses];
    }
    const verseObjects = targetVerse?.verseObjects;
    if (!verseObjects)
      throw new Error(
        `targetBook does not contain verseObjects for reference: ${ref}`
      );
    const refQuotes = getTargetQuotesFromOrigWords({
      wordObjects,
      verseObjects,
      isMatch: false,
    });
    quotes.push(refQuotes);
  }
  return quotes.join(" " + QUOTE_ELLIPSIS + " ");
}

/**
 * Gets the target quote string from a source quote string
 * @param {object} params
 * @param {string} params.quote - the source quote
 * @param {string} params.ref - the reference. i.e. "1:1,10"
 * @param {object} params.sourceBook - the source book chapters object.\
 * @param {object} params.targetBook - the target book chapters object.
 * @param {object} params.options
 * @param {number|string} [params.options.occurrence = -1] - the occurrence to find in the given reference (default: -1)
 * @param {boolean} [params.options.fromOrigLang = true] - true if the source language is an original language (default: true)
 * @returns
 */
export function getTargetQuoteFromSourceQuote({
  quote,
  ref,
  sourceBook,
  targetBook,
  options,
}) {
  const { occurrence: o = -1, fromOrigLang = true } = options;
  const occurrence = parseInt(o, 10);

  const quoteMatches = getQuoteMatchesInBookRef({
    quote,
    ref,
    bookObject: sourceBook,
    isOrigLang: fromOrigLang,
    occurrence,
  });

  const targetQuotes = getTargetQuoteFromWords({
    targetBook,
    wordsMap: quoteMatches,
  });
  return targetQuotes;
}
