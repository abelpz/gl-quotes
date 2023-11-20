let verseObjectsMap = new Map();
const reference = {};
const books = [];

if (
  reference &&
  reference.verse &&
  books &&
  books[0] &&
  ((books[0].chapters && books[0].chapters[reference.chapter]) ||
    (books[0].json.chapters && books[0].json.chapters[reference.chapter]))
) {
  const book = books[0].json ? books[0].json : books[0];
  const chapter = book.chapters[reference.chapter];
  const _verse = reference?.verse;
  if (!reference?.bcvQuery) {
    const verse = chapter[reference.verse];
    const _verseObjects = verse ? verse.verseObjects : [];
    const ref = `${reference.chapter}:${reference.verse}`;
    if (!verseObjectsMap.has(ref)) verseObjectsMap.set(ref, []);
    verseObjectsMap.get(ref).push(_verseObjects);
  } else {
    const bookObjList = reference?.bcvQuery.book;
    const bookResult = bookObjList ? Object.values(bookObjList)[0] : {};
    Object.entries(bookResult?.ch).forEach(([chapter, { v }]) => {
      Object.entries(v).forEach(([verse, vEntry]) => {
        if (vEntry) {
          const vObj = book.chapters[chapter][verse];
          const _verseObjects = vObj ? vObj.verseObjects : [];
          const ref = `${chapter}:${verse}`;
          if (!verseObjectsMap.has(ref)) verseObjectsMap.set(ref, []);
          verseObjectsMap.get(ref).push(_verseObjects);
        }
      });
    });
  }
}
