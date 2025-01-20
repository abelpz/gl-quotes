import { getQuoteMatchesInBookRef, getTargetQuoteFromWords } from "../src/";
import { normalize } from "./helpers/quote.js";
import { getTargetBook, getSourceBook } from "../examples/getBook";

const TEST_TIMOUT = 10000;

const tests = [
  {
    params: {
      name: "Testing deuteronomy highlighting error",
      bookId: "DEU",
      ref: "1:5-6",
      quote:
        "מֹשֶׁ֔ה בֵּאֵ֛ר אֶת־הַ⁠תּוֹרָ֥ה הַ⁠זֹּ֖את לֵ⁠אמֹֽר׃ & יְהוָ֧ה אֱלֹהֵ֛י⁠נוּ דִּבֶּ֥ר אֵלֵ֖י⁠נוּ בְּ⁠חֹרֵ֣ב לֵ⁠אמֹ֑ר",
    },
    expected:
      "Moses & explaining this law, saying & Yahweh our God spoke to us at Horeb, saying",
  },
];

describe("Find quotes", () => {
  test.each(tests)(
    `REF: "$params.bookId $params.ref" | EXPECTED: "$expected"`,
    async ({ params, expected, expectedSelections }) => {
      const { bookId, ref, quote, occurrence = -1 } = params;

      const targetBook = await getTargetBook(bookId, true);
      const sourceBook = await getSourceBook(bookId, true);

      const quoteMatches = getQuoteMatchesInBookRef({
        quote,
        ref,
        bookObject: sourceBook,
        isOrigLang: true,
        occurrence,
      });

      const targetQuotes = getTargetQuoteFromWords({
        targetBook,
        wordsMap: quoteMatches,
      }, { removeBrackets: true });

      try {
        expect(targetQuotes).toEqual(expected);
      } catch (e) {
        console.log({ params, expected, received: targetQuotes, quoteMatches });
        throw e;
      }
      if (expectedSelections) {
        // if given then also verify the selections are expected
        const selections = quoteMatches.get(ref);
        // normalize the expected selections
        const _expectedSelections = expectedSelections.map((item) => ({
          ...item,
          text: normalize(item.text, true),
        }));
        // eslint-disable-next-line jest/no-conditional-expect
        expect(selections).toEqual(_expectedSelections);
      }
    },
    TEST_TIMOUT
  );
});
