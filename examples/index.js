
import {
  getQuoteMatchesInBookRef,
  getTargetQuoteFromWords,
} from "../src/";
import { getTargetBook, getSourceBook } from "./getBook";

const tests = [
  {
    params: {
      name: "",
      bookId: "TIT",
      ref: "1:4,9",
      quote: "καὶ & καὶ",
      occurrence: 2,
    },
    expected: "both & and",
  },
  {
    params: {
      name: "Middle word not being highlighted",
      bookId: "PSA",
      ref: "6:8-9",
      quote: "יְ֝הוָ֗ה & יְ֭הוָה & יְ֝הוָ֗ה",
    },
    expected: "Yahweh & Yahweh & Yahweh",
  },
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
  // {
  //   params: {
  //     name: "",
  //     bookId: "JOS",
  //     ref: "21:27",
  //     quote: "אֶת־גּוֹלָ֤ן & בְּעֶשְׁתְּרָ֖ה",
  //   },
  //   expected: "Golan & Be Eshterah",
  // },
  // {
  //   params: {
  //     name: "",
  //     bookId: "GEN",
  //     ref: "7:11",
  //     quote: "בִּ⁠שְׁנַ֨ת שֵׁשׁ־מֵא֤וֹת שָׁנָה֙ לְ⁠חַיֵּי נֹ֔חַ",
  //   },
  //   expected: "and every living creature that moves",
  // },
  // {
  //   params: {
  //     name: "",
  //     bookId: "GEN",
  //     ref: "1:21",
  //     quote: "וְ⁠אֵ֣ת כָּל נֶ֣פֶשׁ הַֽ⁠חַיָּ֣ה הָֽ⁠רֹמֶ֡שֶׂת",
  //   },
  //   expected: "and every living creature that moves",
  // },
  // {
  //   params: {
  //     name: "",
  //     bookId: "GEN",
  //     ref: "1:3",
  //     quote: "וַֽ⁠יְהִי אֽוֹר",
  //   },
  //   expected: "And there was light",
  // },
  // {
  //   params: {
  //     name: "",
  //     bookId: "GEN",
  //     ref: "1:3",
  //     quote: "וַֽ⁠יְהִי אֽוֹר",
  //   },
  //   expected: "Selah",
  // },
  // {
  //   params: {
  //     name: "",
  //     bookId: "PSA",
  //     ref: "3:2",
  //     quote: "סֶֽלָה",
  //   },
  //   expected: "Selah",
  // },
  // {
  //   params: {
  //     name: "",
  //     bookId: "PSA",
  //     ref: "1:1",
  //     quote: "אַ֥שְֽׁרֵי",
  //   },
  //   expected: "Happy",
  // },
  // {
  //   params: {
  //     name: "",
  //     bookId: "JOS",
  //     ref: "24:10",
  //     quote: "וָ⁠אַצִּ֥ל אֶתְ⁠כֶ֖ם מִ⁠יָּדֽ⁠וֹ",
  //   },
  //   expected: "and I rescued you from his hand",
  // },
  // {
  //   params: {
  //     name: "",
  //     bookId: "JOS",
  //     ref: "1:11",
  //     quote: "בְּ⁠ע֣וֹד׀ שְׁלֹ֣שֶׁת יָמִ֗ים",
  //   },
  //   expected: "in yet three days",
  // },
  // {
  //   params: {
  //     bookId: "JOS",
  //     ref: "15:7",
  //     quote:
  //       "דְּבִרָ⁠ה֮ מֵ⁠עֵ֣מֶק עָכוֹר֒ & הַ⁠גִּלְגָּ֗ל & לְ⁠מַעֲלֵ֣ה אֲדֻמִּ֔ים & מֵי־עֵ֣ין שֶׁ֔מֶשׁ & עֵ֥ין רֹגֵֽל",
  //   },
  //   expected:
  //     "to Debir from the Valley of Trouble, & the Gilgal, & of the ascent of Adummim, & the waters of En Shemesh & En Rogel",
  // },
  // {
  //   params: {
  //     bookId: "JOS",
  //     ref: "15:7",
  //     quote:
  //       "דְּבִרָ⁠ה֮ מֵ⁠עֵ֣מֶק עָכוֹר֒ & הַ⁠גִּלְגָּ֗ל & לְ⁠מַעֲלֵ֣ה אֲדֻמִּ֔ים & מֵי־עֵ֣ין שֶׁ֔מֶ & עֵ֥ין רֹגֵֽל",
  //   },
  //   expected: "",
  // },
  // {
  //   params: {
  //     bookId: "PHP",
  //     ref: "1:1-20",
  //     quote: "τινὲς μὲν καὶ & τὸν Χριστὸν κηρύσσουσιν",
  //   },
  //   expected: "Some indeed even proclaim Christ",
  // },
  // {
  //   params: {
  //     bookId: "GEN",
  //     ref: "2:23",
  //     quote: "עֶ֚צֶם מֵֽ⁠עֲצָמַ֔⁠י וּ⁠בָשָׂ֖ר מִ⁠בְּשָׂרִ֑⁠י",
  //   },
  //   expected: "is} bone from my bones\nand flesh from my flesh",
  // },
  // {
  //   params: {
  //     bookId: "GEN",
  //     ref: "4:23",
  //     quote: "כִּ֣י אִ֤ישׁ הָרַ֨גְתִּי֙ לְ⁠פִצְעִ֔⁠י וְ⁠יֶ֖לֶד לְ⁠חַבֻּרָתִֽ⁠י",
  //   },
  //   expected:
  //     "For I killed a man for my wound,\neven a young man for my bruise",
  // },
];

tests.forEach(async ({ params, expected }) => {
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
  });

  if (targetQuotes !== expected)
    console.error("Quote not found in", bookId, ref);
});
