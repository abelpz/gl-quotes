# uw-quote-helpers

A helpers library for handling and generating quotes from ®unfoldingWord scripture resources.

## Installation

```bash
npm install uw-quote-helpers
# or
pnpm add uw-quote-helpers
# or
yarn add uw-quote-helpers
```

### Peer Dependencies

This library requires `usfm-js` as a peer dependency:

```bash
npm install usfm-js
# or
pnpm add usfm-js
# or
yarn add usfm-js
```

## API

### Quote Functions

#### `getTargetQuoteFromSourceQuote({ quote, ref, sourceBook, targetBook, options })`

Gets the target quote string from a source quote string.

**Parameters:**

- `quote` (string): The source quote
- `ref` (string): The reference (e.g. "1:1,10")
- `sourceBook` (object): The source book chapters object (see Book Data Structure below)
- `targetBook` (object): The target book chapters object (see Book Data Structure below)
- `options` (object):
  - `occurrence` (number|string): The occurrence to find in the given reference (default: -1)
  - `fromOrigLang` (boolean): True if the source language is an original language (default: true)

**Example:**

```javascript
const params = {
  quote: "καὶ μεθ' ἡμῶν ἔσται",
  ref: "1:2",
  sourceBook: greekBook,
  targetBook: englishBook,
  options: { occurrence: 1 }
};

const result = getTargetQuoteFromSourceQuote(params);
console.log(result); // "and will be with us"
```

#### `cleanQuoteString(quote)`

Cleans and normalizes a quote string by fixing punctuation and spacing.

**Example:**

```javascript
const quote = '"Hello ,world"  ...  how are you?';
const cleaned = cleanQuoteString(quote);
console.log(cleaned); // "Hello, world … how are you?"
```

#### `normalize(str, isOrigLang)`

Normalizes a string by tokenizing and rejoining with spaces.

**Example:**

```javascript
const str = "μεθ' ἡμῶν";
const normalized = normalize(str, true);
console.log(normalized); // "μεθ ἡμῶν"
```

### Scripture Functions

#### `getQuoteMatchesInBookRef({ quote, ref, bookObject, isOrigLang, occurrence })`

Finds matches for a quote within a specific book reference.

**Example:**

```javascript
const params = {
  quote: "καὶ μεθ' ἡμῶν",
  ref: "1:2",
  bookObject: sourceBook,
  isOrigLang: true,
  occurrence: 1
};

const matches = getQuoteMatchesInBookRef(params);
console.log(matches);
/* Returns a Map with entries like:
Map {
  "1:2" => [
    { text: "καὶ", occurrence: 1 },
    { text: "μεθ", occurrence: 1 },
    { text: "ἡμῶν", occurrence: 1 }
  ]
}
*/
```

#### `getTargetQuoteFromWords({ targetBook, wordsMap })`

Generates target language quotes from matched words.

**Parameters:**

- `targetBook` (object): The target book chapters object (see Book Data Structure below)
- `wordsMap` (Map): A map of verse references to arrays of word objects (see `getQuoteMatchesInBookRef` return value)

**Example:**

```javascript
const wordsMap = new Map([
  ["1:2", [
    { text: "καὶ", occurrence: 1 },
    { text: "μεθ", occurrence: 1 },
    { text: "ἡμῶν", occurrence: 1 }
  ]]
]);

const result = getTargetQuoteFromWords({
  targetBook,
  wordsMap
});
console.log(result); // "and with us"
```

#### `getParsedUSFM(usfmData)`

Parses USFM data into a JSON structure. To get the book data structure needed for other functions, access the `.chapters` property of the result.

**Parameters:**

- `usfmData` (string): USFM data to parse

**Returns:**

- A parsed USFM object. Use `.chapters` to get the book data structure needed for other functions.

**Example:**

```javascript
const usfmData = '\\id GEN\n\\c 1\n\\v 1 In the beginning...';
const parsedData = getParsedUSFM(usfmData);
console.log(parsedData.chapters);
/* Output:
{
  "1": {
    "1": {
      "verseObjects": [
        { "text": "In", "type": "word" },
        { "text": " ", "type": "text" },
        { "text": "the", "type": "word" },
        { "text": " ", "type": "text" },
        { "text": "beginning", "type": "word" }
      ]
    }
  }
}
*/
```

#### `setBook(bookData, ref)`

Creates a book object with verse iteration capabilities.

**Parameters:**

- `bookData` (object): A book chapters object (obtained from `getParsedUSFM(usfmData).chapters`)
- `ref` (string): The reference to set (e.g. "1:1,10")

**Returns:**

- A book object with verse iteration capabilities.

**Example:**

```javascript
const bookData = getParsedUSFM(usfmData).chapters;
const book = setBook(bookData, "1:1,10");
console.log(book);
/* Output:
{
  "1": { "1": { "verseObjects": [...], "ref": "1:1,10" } }
}
*/
```

#### `verseObjectsToString(verseObjects, map)`

Converts verse objects to a string representation.

**Parameters:**

- `verseObjects` (array): An array of verse objects (see `getParsedUSFM` return value)
- `map` (Map): A map of verse references to arrays of word objects (see `getQuoteMatchesInBookRef` return value)

**Returns:**

- A string representation of the verse objects.

**Example:**

```javascript
const verseObjects = [{ text: "In", type: "word" }, { text: " ", type: "text" }, { text: "the", type: "word" }];
const map = new Map([["1:1", [{ text: "In", occurrence: 1 }, { text: " ", occurrence: 1 }, { text: "the", occurrence: 1 }]]]);
const result = verseObjectsToString(verseObjects, map);
console.log(result); // "In the"
```

### Book Data Structure

The book data structure used by this library (for `sourceBook` and `targetBook` parameters) follows this format:

```javascript
{
  "1": {  // chapter number
    "1": {  // verse number
      "verseObjects": [  // array of verse objects
        { "text": "In", "type": "word" },
        { "text": " ", "type": "text" },
        { "text": "the", "type": "word" },
        // ...
      ]
    },
    "2": {
      // next verse
    }
  },
  "2": {
    // next chapter
  }
}
```

You can obtain this structure by parsing USFM data:

```javascript
const bookData = getParsedUSFM(usfmData).chapters;
```

## Getting Started Developing

### Using pnpm in terminal

- clone the repo and cd into it
- install by doing: `pnpm i`
- run tests: `pnpm test`
- do build: `pnpm build`
- to publish a beta build: `pnpm publish --tag beta`
- to publish final release: `pnpm publish`

## Examples

1. [Getting target quotes from source quotes (Node.js)](https://codesandbox.io/p/sandbox/bitter-architecture-vx45bn)
