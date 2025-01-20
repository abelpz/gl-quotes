import { getVerses } from "bible-reference-range";
import { toJSON } from "usfm-js";

export const setBook = (bookData, ref) => {
  class Book {
    constructor(verses) {
      this.verses = verses;
    }
    forEachVerse(
      callback = (verseObjects, verseRef) => null,
      { failOnMissingVerse = true } = { failOnMissingVerse: true }
    ) {
      const verseRefs = this.verses;
      for (const verseRef of verseRefs) {
        if (!verseRef.verseData && failOnMissingVerse) {
          return null;
        }
        const verseData = verseRef.verseData;
        let verseObjects; // (verseData && verseData.verseObjects);
        if (verseData) {
          if (typeof verseData === "string") {
            verseObjects = [{ text: verseData }];
          } else if (Array.isArray(verseData)) {
            verseObjects = verseData;
          } else if (verseData.verseObjects) {
            verseObjects = verseData.verseObjects;
          }
          callback(verseObjects, verseRef);
        }
      }
    }
  }
  return new Book(getVerses(bookData, ref));
};

export function verseObjectsReducer(verseObjects, reducer, initialValue, filteredTypes = []) {
  let accumulator = initialValue;
  
  function processVerseObject(verseObject, index, objects) {
    let previousVerseObject = objects[index - 1];

    // Handle nested children in previous object
    if (previousVerseObject && previousVerseObject.children) {
      const { children } = previousVerseObject;
      previousVerseObject = children[children.length - 1];

      if (previousVerseObject.children) {
        const grandChildren = previousVerseObject.children;
        previousVerseObject = grandChildren[grandChildren.length - 1];
      }
    }

    // Skip double spaces
    if (
      previousVerseObject?.text === " " &&
      verseObject.text === " "
    ) {
      return accumulator;
    }

    if (verseObject.text) {
      let text = verseObject.text;
      // Replace newlines with spaces
      if (text.includes("\n")) {
        text = text.replace("\n", "\u0020");
      }
      if (!filteredTypes.length || filteredTypes.includes(verseObject.type)) {
        accumulator = reducer(accumulator, text, index, objects);
      }
    } else if (verseObject.children) {
      // Recursively process children
      verseObject.children.forEach((child, childIndex) => {
        accumulator = processVerseObject(child, childIndex, verseObject.children);
      });
    }

    return accumulator;
  }

  verseObjects.forEach((verseObject, index) => {
    accumulator = processVerseObject(verseObject, index, verseObjects);
  });

  return accumulator;
}

export function verseObjectsToString(verseObjects, map) {
  return verseObjectsReducer(verseObjects, (acc, text) => acc + (map ? map(text) : text), '')
    // remove double spaces
    .replace(/ {2}/gi, " ")
    // remove spaces before commas
    .replace(/ , /gi, ", ")
    // remove spaces before periods
    .replace(/ ."/gi, '."')
    // remove space before apostrophes
    .replace(/ './gi, "'.")
    // replace space before semicolon
    .replace(/ ; /gi, "; ")
    // remove spaces before question marks
    .replace(/\s+([?])/gi, "$1")
    // remove whitespace from the beginning
    .trimLeft();
}

export const refToString = ({ chapter, verse }) => `${chapter}:${verse}`;

/**
 * @description Parses the usfm file using usfm-parse library.
 * @param {string} usfmData - USFM data to parse
 */
export function getParsedUSFM(usfmData) {
  try {
    if (usfmData) {
      return toJSON(usfmData, { convertToInt: ["occurrence", "occurrences"] });
    }
  } catch (e) {
    console.error(e);
  }
}
