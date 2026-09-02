/** Book-like Zotero types whose PDFs usually start with title/copyright/TOC. */
export const BOOKISH_ITEM_TYPES = new Set([
  "book",
  "bookSection",
  "thesis",
  "report",
  "manuscript",
]);

const MAX_PAGES_TO_SCAN = 40;
const MAX_BLOCKS_TO_SKIP = 80;
const IMPRINT_SCAN_CHARS = 25_000;

const SKIP_HEADING =
  /^(?:table of contents|acknowledg(?:e)?ments?|dedication|credits|permissions?|list of (?:figures|tables|illustrations|plates|abbreviations|contributors)|notes on (?:the )?contributors|about the authors?|also by|works of|by the same author|praise for|reviews?|copyright|impressum|inhaltsverzeichnis|table des mati[eè]res|remerciements|danksagung|series editor['\u2019]?s preface|foreword from the series editors|publisher['\u2019]?s note|translator['\u2019]?s note|abbreviations)\b/i;

const FRONTMATTER_CUES =
  /copyright|\u00a9|all rights reserved|isbn[\s:-]|library of congress|catalogu(?:ing|ing).{0,16}publication|printed (?:and bound )?in\b|first published|this (?:paperback |hardcover )?edition|doi:\s*10\.|this page intentionally left blank|alle rechte vorbehalten|tous droits r[eé]serv[eé]s/i;

const IMPRINT_HEAD =
  /isbn(?:-1[03])?[:\s-]|all rights reserved|library of congress|©|copyright\s+\d{4}|first published/i;

const PRINTING_LINE =
  /(?:^|\n)\s*10\s+9\s+8\s+7\s+6\s+5\s+4\s+3\s+2\s+1\s*(?:\n|$)/;

const CONTENT_HEADING =
  /(?:^|\n)\s*(?:chapter\s*(?:\d+|[ivxlcdm]+|one|two|three|i|ii|iii)\b|part\s+(?:one|1|i)\b|introduction|introductory note|einleitung|introducci[oó]n|author['\u2019]?s (?:note|preface)|preface|foreword|presentation\s+[ivxlcdm]+\b|in lieu of a (?:foreword|preface)|to begin with|[ivxlcdm]+\.[\s\n]+[A-Z])[^\n]{0,160}\n+/i;

export function isBookishItemType(itemType: string): boolean {
  return BOOKISH_ITEM_TYPES.has(itemType);
}

/** Books plus HTML snapshots whose text starts with site chrome or archive metadata. */
export function shouldSkipFrontmatter(itemType: string): boolean {
  return (
    isBookishItemType(itemType) ||
    itemType === "webpage" ||
    itemType === "blogPost"
  );
}

/** pdftotext / Zotero `.zotero-ft-cache` pages, if the extractor kept breaks. */
export function splitPdfCachePages(raw: string): string[] {
  if (!raw) {
    return [];
  }
  if (raw.includes("\f")) {
    return raw.split("\f").map((page) => page.trim());
  }
  if (raw.includes("\u000c")) {
    return raw.split("\u000c").map((page) => page.trim());
  }
  return [raw];
}

function firstNonEmptyLine(text: string): string {
  return (
    text
      .split(/\n/)
      .map((line) => line.trim())
      .find(Boolean) || ""
  );
}

export function looksLikeToc(text: string): boolean {
  const lines = text
    .split(/\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  if (
    /\bcontents$/i.test(lines[0] || "") ||
    /^(?:table of )?contents$/i.test(lines[0] || "") ||
    /^(?:works (?:of|by)|also by|by the same author)\b/i.test(lines[0] || "")
  ) {
    return true;
  }
  if (lines.length < 4) {
    return false;
  }
  if (lines.slice(0, 8).some((line) => /^(?:notes|index)$/i.test(line))) {
    return true;
  }
  let leadingTitles = 0;
  for (const line of lines.slice(0, 8)) {
    if (line.length > 90 || /[.!?]["']?\s+[A-Z]/.test(line)) {
      break;
    }
    if (line.length < 70 && /^[A-Z]/.test(line) && !/[.!?:]/.test(line)) {
      leadingTitles += 1;
    }
  }
  if (leadingTitles >= 3) {
    return true;
  }
  let dotted = 0;
  let numbered = 0;
  let chapterish = 0;
  let sections = 0;
  for (const line of lines) {
    if (/\.{2,}\s*(?:\d{1,4}|[ivxlcdm]+)$/i.test(line)) {
      dotted += 1;
      continue;
    }
    if (
      line.length < 90 &&
      /^(?:chapter\s+)?(?:\d+|[ivxlcdm]+)\b/i.test(line) &&
      /\s+\d{1,4}$/.test(line)
    ) {
      numbered += 1;
    }
    if (
      line.length < 90 &&
      /^(?:\d+|[ivxlcdm]+)\s+[A-Z“'"‘]/.test(line) &&
      !/[.!?].*[a-z]/.test(line)
    ) {
      chapterish += 1;
    }
    if (/^§\s*\d+/.test(line) || /^chapter\s+[ivxlcdm]+\./i.test(line)) {
      sections += 1;
    }
  }
  const presentations = lines.filter((line) =>
    /^presentation\s+[ivxlcdm]+\b/i.test(line),
  ).length;
  let jammedTitles = 0;
  for (const line of lines.slice(0, 12)) {
    if (/[.!?]["']?\s+[A-Z]/.test(line) && line.length > 90) {
      break;
    }
    if (isJammedTocTitle(line)) {
      jammedTitles += 1;
    }
  }
  const shortTitles = lines.filter(
    (line) =>
      line.length > 2 &&
      line.length < 70 &&
      /^[A-Z]/.test(line) &&
      !/[.!?]/.test(line),
  ).length;
  return (
    dotted >= 5 ||
    numbered >= 6 ||
    chapterish >= 3 ||
    sections >= 3 ||
    presentations >= 2 ||
    jammedTitles >= 3 ||
    (shortTitles >= 8 && shortTitles / lines.length > 0.55) ||
    (dotted + numbered) / lines.length > 0.4
  );
}

/** EPUB contents lines that glue a name onto a title (`Theodor AdornoCommitment`). */
function isJammedTocTitle(line: string): boolean {
  const trimmed = line.trim();
  if (/^presentation\s+[ivxlcdm]+\b/i.test(trimmed)) {
    return true;
  }
  if (/^(?:notes|index|contents)$/i.test(trimmed)) {
    return true;
  }
  return (
    trimmed.length < 90 &&
    /[a-z][A-Z]/.test(trimmed) &&
    !/[.!?].{12}/.test(trimmed)
  );
}

function wordList(text: string): string[] {
  return text.split(/\s+/).filter((word) => /[A-Za-z\u00C0-\u024F]/.test(word));
}

function sentenceCount(text: string): number {
  const stripped = text.replace(/\b[A-Z]\./g, " ");
  const matches = stripped.match(/[.!?]["'”’)\]]*\s+[A-Z“"]/g);
  return matches ? matches.length : 0;
}

function looksLikeRunningProse(
  text: string,
  opts?: { minWords?: number; minSentences?: number },
): boolean {
  const minWords = opts?.minWords ?? 45;
  const minSentences = opts?.minSentences ?? 2;
  const words = wordList(text);
  if (words.length < minWords) {
    return false;
  }
  if (sentenceCount(text) < minSentences) {
    return false;
  }
  const lower = words.filter((word) => /^[a-z\u00E0-\u024F]/.test(word)).length;
  return lower / words.length > 0.35;
}

const ABSTRACT_HEAD =
  /(?:^|\n)[ \t]*(?:abstract|r[eé]sum[eé]|resumen|zusammenfassung)\b[ \t]*(?:[:.\-–—][ \t]*|(?=\n))/i;
const ABSTRACT_END =
  /(?:^|\n)\s*(?:key\s*words?|keywords|mot[s]?\s+cl[ée]s|palabras\s+clave)\s*[:.\-–—]/i;

/** Journal PDFs: skip the masthead and return the abstract paragraph. */
export function sliceFromPdfAbstract(text: string): string {
  const match = text.match(ABSTRACT_HEAD);
  if (!match || match.index == null) {
    return "";
  }
  let from = text.slice(match.index + match[0].length).replace(/^\s+/, "");
  const end = from.search(ABSTRACT_END);
  if (end >= 80) {
    from = from.slice(0, end).trim();
  }
  if (
    looksLikeRunningProse(from.slice(0, 600), {
      minWords: 25,
      minSentences: 1,
    })
  ) {
    return from;
  }
  return "";
}

function looksLikeParagraphStart(line: string): boolean {
  if (line.length < 70) {
    return false;
  }
  if (/^(?:©|copyright\b|isbn\b)/i.test(line)) {
    return false;
  }
  if (
    /excerpted from|the full text appears in\b|\bthis chapter will\b/i.test(
      line,
    )
  ) {
    return false;
  }
  if (
    /all rights reserved|no part of this (?:book|publication|work) may be|without written permission|stored in a retrieval system|includes bibliographical references|p\.\s*cm\.|library of congress cataloging|\bisbn\b|fully protected by copyright|inquiries concerning the rights|amateur stage production|identified as authors of this work|have been asserted by them|copyright, designs and patents act/i.test(
      line,
    )
  ) {
    return false;
  }
  if (!/^[A-Z“"‘'«]/.test(line) && !/^\d+\.\d+\.?\s+[A-Z]/.test(line)) {
    return false;
  }
  return sentenceCount(line) >= 1 || line.length > 160;
}

/**
 * Skip journal mastheads, titles, and running headers until the first
 * paragraph of body prose.
 */
export function sliceFromFirstProseParagraph(text: string): string {
  const lines = text.split(/\n/);
  const limit = Math.min(lines.length, 120);
  for (let i = 0; i < limit; i++) {
    const line = lines[i].trim();
    if (!looksLikeParagraphStart(line)) {
      continue;
    }
    const from = lines.slice(i).join("\n").replace(/^\s+/, "");
    if (
      looksLikeRunningProse(from.slice(0, 700), {
        minWords: 30,
        minSentences: 1,
      })
    ) {
      return from;
    }
  }
  return "";
}

function headingPrefix(text: string): string {
  const lines = text
    .split(/\n/)
    .map((line) => collapseSpacedLetterRuns(line.trim()))
    .filter(Boolean);
  return lines.slice(0, 4).join(" ").slice(0, 240);
}

/** OCR that spells a heading as `N o t e s o n t h e c o n t r i b u t o r s`. */
function collapseSpacedLetterRuns(text: string): string {
  const tokens = text.split(/\s+/);
  const out: string[] = [];
  let run = "";
  for (const token of tokens) {
    if (token.length === 1 && /[A-Za-z]/.test(token)) {
      run += token;
      continue;
    }
    if (run) {
      out.push(run);
      run = "";
    }
    out.push(token);
  }
  if (run) {
    out.push(run);
  }
  return out.join(" ");
}

function letterRatio(text: string): number {
  const letters = (text.match(/[A-Za-z]/g) || []).length;
  return letters / Math.max(text.replace(/\s+/g, "").length, 1);
}

function lastImprintIndex(text: string): number {
  const window = text.slice(0, IMPRINT_SCAN_CHARS);
  const re = /ISBN(?:-1[03])?[:\s-]|all rights reserved/gi;
  let cut = 0;
  let match: RegExpExecArray | null;
  while ((match = re.exec(window))) {
    cut = match.index + match[0].length;
  }
  return cut;
}

function afterLastImprint(text: string): string {
  const cut = lastImprintIndex(text);
  if (cut < 80) {
    return text;
  }
  const rest = text.slice(cut);
  const newline = rest.search(/\n\s*\n/);
  return (newline >= 0 ? rest.slice(newline) : rest).trim() || text;
}

/** Title, copyright, TOC, dedication, acknowledgements — not chapter prose. */
export function isPdfFrontmatterPage(text: string): boolean {
  const trimmed = text.replace(/\s+/g, " ").trim();
  if (!trimmed) {
    return true;
  }
  if (looksLikeToc(text)) {
    return true;
  }
  const first = firstNonEmptyLine(text);
  if (/^(?:table of )?contents$/i.test(first)) {
    return true;
  }
  if (/^(?:[A-Za-z] ){6,}[A-Za-z](?:\s|$)/.test(firstNonEmptyLine(text))) {
    return true;
  }
  const heading = collapseSpacedLetterRuns(
    headingPrefix(text).replace(/^(?:[ivxlcdm]+\s+|viii\s+|\d+\s+)/i, ""),
  );
  if (new RegExp(SKIP_HEADING.source, SKIP_HEADING.flags).test(heading)) {
    return true;
  }
  const words = wordList(trimmed);
  const sentences = sentenceCount(trimmed);
  if (letterRatio(trimmed) < 0.58 && sentences < 4) {
    return true;
  }
  if (PRINTING_LINE.test(text) && words.length < 160) {
    return true;
  }
  const hasBodyProse = Boolean(sliceFromFirstProseParagraph(text));
  if (IMPRINT_HEAD.test(text.slice(0, 500)) && !hasBodyProse) {
    return true;
  }
  if (FRONTMATTER_CUES.test(trimmed) && words.length < 400 && !hasBodyProse) {
    return true;
  }
  if (looksLikeRunningProse(trimmed)) {
    return false;
  }
  if (sentences < 2 && words.length < 100) {
    return true;
  }
  return words.length < 35;
}

function isTocHeadingLine(line: string): boolean {
  const trimmed = line.trim();
  return (
    /\.{2,}\s*(?:\d{1,4}|[ivxlcdm]+)$/i.test(trimmed) ||
    (trimmed.length < 90 &&
      /^(?:chapter|part|introduction|author'?s note)\b/i.test(trimmed) &&
      /\s+\d{1,4}$/.test(trimmed))
  );
}

function contentHeadingRank(line: string, page = ""): number {
  const t = line
    .toLowerCase()
    .replace(/['\u2019]/g, "'")
    .trim();
  if (/chapter\s*(?:1|i|one)\b/.test(t) || /^i\./.test(t) || /^i$/.test(t)) {
    if (page && looksLikeRunningChapterHeader(page)) {
      return 1;
    }
    return 3;
  }
  if (/\bintroduction\b|\bintroductory note\b/.test(t)) {
    return 2;
  }
  return 1;
}

/**
 * `Chapter1 What do we mean by youth work?` on a later page, then mid-argument
 * prose — not the chapter opening.
 */
function looksLikeRunningChapterHeader(page: string): boolean {
  const first = firstNonEmptyLine(page);
  if (!/chapter\s*\d+\s+\S+/i.test(first)) {
    return false;
  }
  const after = page.replace(/^[^\n]+\n+/, "").replace(/^\s+/, "");
  if (
    /\bthis chapter\b|\bthis book\b|\bthis volume\b/i.test(after.slice(0, 400))
  ) {
    return false;
  }
  return looksLikeRunningProse(after.slice(0, 400), {
    minWords: 25,
    minSentences: 1,
  });
}

/** `Chapter1` / `Chapter 2` running headers, for ordering form-feed pages. */
function chapterNumberFromLine(line: string): number | null {
  const match = line.match(/chapter\s*(\d+)/i);
  if (match) {
    return Number(match[1]);
  }
  const roman = line.match(/chapter\s*(i{1,3}|iv|vi{0,3}|one|two|three)\b/i);
  if (!roman) {
    return null;
  }
  const token = roman[1].toLowerCase();
  if (token === "one" || token === "i") {
    return 1;
  }
  if (token === "two" || token === "ii") {
    return 2;
  }
  if (token === "three" || token === "iii") {
    return 3;
  }
  return null;
}

function isValidContentSlice(text: string, index: number): string | null {
  const from = text.slice(index).replace(/^\s+/, "");
  const afterTitle = from.replace(/^[^\n]+\n+/, "").trim();
  if (
    looksLikeToc(afterTitle.slice(0, 700)) ||
    looksLikeToc(from.slice(0, 700))
  ) {
    return null;
  }
  const lead = afterTitle.replace(/\b[A-Z]\./g, " ").slice(0, 400);
  if (!/[.!?]/.test(lead)) {
    return null;
  }
  const nearby = from.slice(0, 500);
  if (looksLikeToc(nearby)) {
    return null;
  }
  if (
    looksLikeRunningProse(afterTitle.slice(0, 400), {
      minWords: 25,
      minSentences: 1,
    }) &&
    !isPdfFrontmatterPage(nearby)
  ) {
    return from;
  }
  return null;
}

function sliceFromFirstContentHeading(text: string): string {
  const imprintCut = lastImprintIndex(text);
  const candidates: Array<{ rank: number; index: number; from: string }> = [];
  const regex = new RegExp(CONTENT_HEADING.source, "gi");
  for (const match of text.matchAll(regex)) {
    if (imprintCut >= 80 && match.index < imprintCut) {
      continue;
    }
    const line = (
      text
        .slice(match.index, match.index + match[0].length)
        .split("\n")
        .find((part) => part.trim()) || ""
    ).trim();
    if (isTocHeadingLine(line)) {
      continue;
    }
    const from = isValidContentSlice(text, match.index);
    if (from) {
      candidates.push({
        rank: contentHeadingRank(line, from),
        index: match.index,
        from,
      });
    }
  }
  const roman = /(?:^|\n)\s*(I)\s*\n([A-Z][A-Za-z ,:'-]{8,90})\n/g;
  for (const match of text.matchAll(roman)) {
    const index = match.index + match[0].search(/\bI\b/);
    if (imprintCut >= 80 && index < imprintCut) {
      continue;
    }
    const from = isValidContentSlice(text, index);
    if (from) {
      candidates.push({ rank: 3, index, from });
    }
  }
  if (candidates.length === 0) {
    return "";
  }
  candidates.sort((a, b) => b.rank - a.rank || a.index - b.index);
  return candidates[0].from;
}

function firstProseWindow(text: string): string {
  const step = 300;
  const size = 900;
  const limit = Math.min(text.length, 80_000);
  const imprintCut = lastImprintIndex(text);
  const startAt = imprintCut >= 80 ? imprintCut : 0;
  for (let i = startAt; i < limit; i += step) {
    const slice = text.slice(i, i + size);
    if (!looksLikeRunningProse(slice) || isPdfFrontmatterPage(slice)) {
      continue;
    }
    const back = text.lastIndexOf(". ", i);
    const start = back >= 0 && i - back < 220 ? back + 2 : i;
    return text.slice(start);
  }
  return "";
}

function skipLeadingFrontmatterBlocks(text: string): string {
  const fromHeading = sliceFromFirstContentHeading(text);
  if (fromHeading) {
    return fromHeading;
  }
  const blocks = text.split(/\n{2,}/);
  if (blocks.length >= 2) {
    let index = 0;
    const limit = Math.min(blocks.length - 1, MAX_BLOCKS_TO_SKIP);
    while (index < limit && isPdfFrontmatterPage(blocks[index])) {
      index += 1;
    }
    const rest = blocks.slice(index).join("\n\n").trim();
    if (rest && !isPdfFrontmatterPage(rest.slice(0, 1600))) {
      return rest;
    }
    if (looksLikeRunningProse(rest) && !IMPRINT_HEAD.test(rest.slice(0, 500))) {
      return rest;
    }
  }
  return sliceFromFirstContentHeading(text) || firstProseWindow(text);
}

function bestFallbackPage(pages: string[]): string {
  const ranked = pages
    .filter(
      (page) =>
        page && !looksLikeToc(page) && !IMPRINT_HEAD.test(page.slice(0, 500)),
    )
    .slice()
    .sort((a, b) => sentenceCount(b) - sentenceCount(a) || b.length - a.length);
  const candidate = ranked[0] || "";
  if (
    candidate &&
    looksLikeRunningProse(candidate, { minWords: 40, minSentences: 1 })
  ) {
    return candidate;
  }
  return "";
}

/**
 * Drop title/copyright/TOC pages and return the first stretch of running
 * content (chapter, introduction, or similar). Empty if nothing looks like
 * prose — better no blurb than an imprint page.
 */
export function firstPdfContentText(raw: string): string {
  const pages = splitPdfCachePages(raw).filter(Boolean);
  let picked = "";
  if (pages.length > 1) {
    const scan = pages.slice(0, MAX_PAGES_TO_SCAN);
    const ranked: Array<{ rank: number; index: number; page: string }> = [];
    for (let index = 0; index < scan.length; index++) {
      const page = scan[index];
      if (isPdfFrontmatterPage(page)) {
        continue;
      }
      ranked.push({
        rank: contentHeadingRank(firstNonEmptyLine(page), page),
        index,
        page,
      });
    }
    if (ranked.length > 0) {
      ranked.sort((a, b) => {
        if (b.rank !== a.rank) {
          return b.rank - a.rank;
        }
        const chapterA = chapterNumberFromLine(firstNonEmptyLine(a.page));
        const chapterB = chapterNumberFromLine(firstNonEmptyLine(b.page));
        if (chapterA != null && chapterB != null && chapterA !== chapterB) {
          return chapterA - chapterB;
        }
        return a.index - b.index;
      });
      picked = ranked[0].page;
    } else {
      picked = bestFallbackPage(scan);
    }
  } else {
    picked = skipLeadingFrontmatterBlocks(afterLastImprint(raw));
  }
  return sliceFromFirstProseParagraph(picked) || picked;
}
