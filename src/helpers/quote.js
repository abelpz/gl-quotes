import { tokenize, tokenizeOrigLang } from "string-punctuation-tokenizer";
import { DEFAULT_SEPARATOR, QUOTE_ELLIPSIS, REMOVE_BRACKETS_PATTERN } from "../utils/consts";
import {  setBook, verseObjectsReducer } from "./scripture";
import { doesReferenceContain } from "bible-reference-range";

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
}, { removeBrackets = false } = {}) {
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
          separator = DEFAULT_SEPARATOR +QUOTE_ELLIPSIS + DEFAULT_SEPARATOR;
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
          }, { removeBrackets });
        }
      } else if (verseObject.children) {
        // Did not find a match, yet still need to go through all the children and see if there's match.
        // If there isn't a match here, i.e. childText is empty, and we have text, we still need
        // an ellipsis if a later match is found since there was some text here
        let childText = getTargetQuotesFromOrigWords({
          wordObjects,
          verseObjects: verseObject.children,
          isMatch,
        }, { removeBrackets });

        if (childText) {
          lastMatch = true;

          if (needsEllipsis) {
            separator = DEFAULT_SEPARATOR + QUOTE_ELLIPSIS + DEFAULT_SEPARATOR;
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
      // We want to preserve this so we can show "God's" instead of "God & s"
      if (separator === DEFAULT_SEPARATOR) {
        separator = "";
      }
      separator += verseObjects[i + 1].text;
    }
  }

  const result = removeBrackets ? text.replace(REMOVE_BRACKETS_PATTERN, "") : text;

  return result;
}

export function getQuoteMatchesInBookRef({
  quote,
  ref,
  bookObject,
  isOrigLang,
  occurrence = -1,
}) {
  if (occurrence === 0) return new Map();

  const quoteTokens = tokenizeQuote(quote, isOrigLang);

  const book = setBook(bookObject, ref);
  return findQuoteMatches(book, quoteTokens, occurrence);
}

export function getTargetQuoteFromWords({ targetBook, wordsMap }, {removeBrackets = false} = {}) {
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
    }, { removeBrackets });
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
  const { occurrence: o = -1, fromOrigLang = true, removeBrackets = false } = options;
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
  }, { removeBrackets });
  return targetQuotes;
}

// Helper functions to make the main logic clearer
function createTokensMap(quoteTokens) {
  return quoteTokens.reduce((tokensMap, word) => {
    tokensMap.set(normalize(word, true), { count: 0 });
    return tokensMap;
  }, new Map());
}

function processWord(word, tokensMap, verseRef, wordIndex) {
  if (!word || !tokensMap || !verseRef) {
    return null;
  }

  const normalizedWord = normalize(word, true);
  if (!normalizedWord) return null;
  
  const quote = tokensMap.get(normalizedWord);
  if (!quote) return null;
  
  quote.count++;
  return {
    word: normalizedWord,
    occurrence: quote.count,
    ref: verseRef,
    index: wordIndex
  };
}

// Define a clear type structure for matches
function createMatchEntry(word, wordData) {
  if (!word || !wordData) {
    throw new Error('Invalid parameters for createMatchEntry');
  }
  return {
    matchedText: word,
    wordMatches: [wordData]
  };
}

function tryAppendToLastMatch(matchesArray, wordData, normalizedWord) {
  if (!matchesArray.length) return false;
  
  const lastMatch = matchesArray[matchesArray.length - 1];
  const lastWordInQuote = lastMatch.wordMatches[lastMatch.wordMatches.length - 1];

  // Check if words are consecutive
  if (lastWordInQuote.index === wordData.index - 1) {
    lastMatch.matchedText = `${lastMatch.matchedText} ${normalizedWord}`;
    lastMatch.wordMatches.push(wordData);
    return true;
  }
  return false;
}

/** 
 * @description Finds the index of the nth occurrence of a quote in the matches array.
 * @param {Array<object>} matches - The array of matches to search through
 * @param {number} quoteIndex - The index of the quote to search for
 * @param {number} targetOccurrence - The occurrence number to find
 * @returns {number} The index of the nth occurrence of the quote, or -1 if not found
 */
function findQuoteOccurrenceIndex(matches, quoteIndex = 0, targetOccurrence = 1) {
  let occurrenceCount = 0;
  
  for (let i = 0; i < matches.length; i++) {
    if (matches[i].quoteIndex === quoteIndex) {
      occurrenceCount++;
      if (occurrenceCount === targetOccurrence) {
        return i;
      }
    }
  }
  return -1;
}

function findConsecutiveQuotes(filteredMatches, firstQuoteIndex, splittedQuotes) {
  let targetIndex = 1;
  const totalQuotes = splittedQuotes.length;
  const results = [];
  
  for (const match of filteredMatches.slice(firstQuoteIndex + 1)) {
    if (match.matchedText !== splittedQuotes[targetIndex]) break;
    results.push(match);
    targetIndex++;
    
    if (targetIndex === totalQuotes) {
      return results;
    }
  }
  return [];
}

/**
 * Quote Structure Terminology:
 * 
 * wholeQuote: Complete quote string containing multiple parts joined by "&"
 *   Example: "beginning & was the Word & was with God & was God"
 * 
 * quotePart: Single segment of the quote (between "&" separators)
 *   Example: "was the Word"
 * 
 * quoteWord: Individual word within a quotePart
 *   Example: "was"
 * 
 * Key Variables:
 * - quoteTokens: Array of normalized quoteWords and quotePartJoiners
 *     Example: ["beginning", "&", "was", "the", "Word", "&", ...]
 */
function findQuoteMatches(book, quoteTokens, occurrence) {
  // Early validation
  if (occurrence === 0) {
    return new Map();
  }

  if(!book) throw new Error("Invalid input, book is undefined");
  if (!quoteTokens) throw new Error("Invalid input, quoteTokens is undefined");

  /**
   * Split the quote into parts, where each part is a quotePart.
   * Example: "beginning & was the Word & was with God & was God"
   * splittedQuotes: ["beginning", "was the Word", "was with God", "was God"]
   * 
   * @type {Array<string>}
   */
  const splittedQuotes = quoteTokens.join(" ").split(" & ");
  let wordIndex = 0;
  const matchesArray = [];

  // First pass: Find all potential matches for each quotePart
  book.forEachVerse((verseObjects, verseRef) => {
    const tokensMap = createTokensMap(quoteTokens);

    verseObjectsReducer(verseObjects, (acc, word) => {
      wordIndex++;
      
      const wordData = processWord(word, tokensMap, verseRef, wordIndex);
      if (!wordData) return acc;

      // Try to append to previous match if consecutive, meaning this quoteWord is part of the previously matched partial quotePart. e.g. "Word" is part of "was the Word"
      if (tryAppendToLastMatch(matchesArray, wordData, wordData.word)) {
        return acc;
      }

      // Create new match entry using the explicit structure
      acc.push(createMatchEntry(wordData.word, wordData));
      
      return acc;
    }, matchesArray, ['word']);
  });

  if (!matchesArray.length) return new Map();

  // Second pass: Filter matches to only keep complete quote parts
  // Example: For quote "was the Word", remove matches of just "was" or "the"
  // Also adds the position (index) of where each matched quotePart appears in the original wholeQuote
  const filteredMatches = matchesArray.reduce((acc, match) => {
    const quoteIndex = splittedQuotes.indexOf(match.matchedText);
    if (quoteIndex !== -1) {
      // Enhance the match object with quote position information
      acc.push({
        ...match,
        quoteIndex: quoteIndex // Add the position in the original quote
      });
    }
    return acc;
  }, []);

  let matches = [];

  // When occurrence is greater than 0, we are searching for the nth occurrence of the first quote, and the consecutive quoteParts that follows it.
  // Example: For the wholeQuote "was & God", and occurrence 2, we are searching for the 2nd occurrence of "was" and the quotePart "God" that follows it.
  if (occurrence > 0) {
    // Find the index of the nth occurrence of the first quote
    const indexOfFirstQuote = findQuoteOccurrenceIndex(filteredMatches, 0, occurrence);
    if (indexOfFirstQuote === -1) return new Map();

    // Find the consecutive quotes that follow the nth occurrence of the first quote
    const followingQuotes = findConsecutiveQuotes(
      filteredMatches,
      indexOfFirstQuote,
      splittedQuotes
    );

    // Check if the total number of quoteParts found is less than the total number of quoteParts in splittedQuotes
    if (followingQuotes.length + 1 < splittedQuotes.length) {
      return new Map();
    }

    // Combine the first quotePart and the consecutive quoteParts
    matches = [
      filteredMatches[indexOfFirstQuote],
      ...followingQuotes,
    ];
  } else if (occurrence === -1) {
    // When occurrence is -1, we are searching for all consecutive wholeQuote matches
    // Example: For the wholeQuote "was & God", we are searching for all matches of "was" and "God", i.e. "the word {was} with {God}, and the word {was} {God}"
    matches = findConsecutiveWholeQuoteMatches(filteredMatches, splittedQuotes);
  } else {
    console.warn("Invalid occurrence value, must be greater that -1");
    return new Map();
  }

  // Create a map of occurrences for each reference
  const matchesMap = matches.reduce((occurrencesMap, matchItem) => {
    const matchesToProcess = Array.isArray(matchItem) ? matchItem : [matchItem];

    matchesToProcess.forEach((match) => {
      match.wordMatches.forEach(({ word, occurrence, ref }) => {
        const refString = `${ref.chapter}:${ref.verse}`;
        const wordData = { text: word, occurrence };

        if (occurrencesMap.has(refString)) {
          occurrencesMap.get(refString).push(wordData);
        } else {
          occurrencesMap.set(refString, [wordData]);
        }
      });
    });

    return occurrencesMap;
  }, new Map());

  return matchesMap;
}

function findConsecutiveWholeQuoteMatches(filteredMatches,  quoteParts) {
  const totalQuotes = quoteParts.length;
  const results = [];
  let currentGroup = [];
  let expectedQuoteIndex = 0;

  for (const match of filteredMatches) {
    if (match.matchedText !== quoteParts[expectedQuoteIndex]) {
      if (currentGroup.length === totalQuotes) {
        results.push(currentGroup);
      }
      currentGroup = [];
      expectedQuoteIndex = 0;
    }
    else {
      currentGroup.push(match);
      expectedQuoteIndex++;
      
      if (expectedQuoteIndex === totalQuotes) {
        results.push([...currentGroup]);
        currentGroup = [];
        expectedQuoteIndex = 0;
      }
    }
  }

  return results;
}