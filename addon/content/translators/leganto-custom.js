// @ts-nocheck
/* eslint-disable */

/*
  Copyright © 2026 Jan Baykara
  This file is part of Zotero Syllabus.

  Zotero is free software: you can redistribute it and/or modify
  it under the terms of the GNU Affero General Public License as published by
  the Free Software Foundation, either version 3 of the License, or
  (at your option) any later version.
*/

function safeLog() {
  var args = Array.prototype.slice.call(arguments);
  if (typeof ztoolkit !== "undefined") {
    ztoolkit.log.apply(ztoolkit, args);
  } else if (typeof Zotero !== "undefined" && Zotero.debug) {
    Zotero.debug(
      args
        .map(function (a) {
          return typeof a === "object" ? JSON.stringify(a) : a;
        })
        .join(" "),
    );
  } else if (typeof console !== "undefined") {
    console.log.apply(console, args);
  }
}

var JSON_HEADERS = {
  Accept: "application/json, text/plain, */*",
  nui: "true",
};

var PRIORITY_COLORS = {
  Essential: "#8B5CF6",
  Mandatory: "#8B5CF6",
  Required: "#8B5CF6",
  Recommended: "#3B82F6",
  Suggested: "#3B82F6",
  Optional: "#95A5A6",
  "Further Reading": "#95A5A6",
  "Further reading": "#95A5A6",
};

function isLegantoUrl(url) {
  if (!url) {
    return false;
  }
  return /\/leganto\//.test(url) || /leganto\.exlibrisgroup\.com/i.test(url);
}

function getListId(url) {
  var match = String(url || "").match(/\/lists\/(\d+)/);
  return match ? match[1] : null;
}

function getCitationId(url) {
  var match =
    String(url || "").match(/\/citations?\/(\d+)/) ||
    String(url || "").match(/[?&]citation(?:Id)?=(\d+)/i);
  return match ? match[1] : null;
}

function detectWeb(doc, url) {
  safeLog("LEGANTO-CUSTOM: detectWeb", url);
  if (!isLegantoUrl(url)) {
    return false;
  }
  if (getListId(url)) {
    return "multiple";
  }
  if (getCitationId(url)) {
    return "journalArticle";
  }
  return false;
}

function citationToAssignmentId(citationId) {
  if (!citationId) {
    return null;
  }
  var id = String(citationId);
  if (id.indexOf("assignment-") === 0) {
    return id;
  }
  return "assignment-" + id;
}

function originFromUrl(url) {
  try {
    return new URL(url).origin;
  } catch (e) {
    return "";
  }
}

function apiUrl(pageUrl, path) {
  return originFromUrl(pageUrl) + path;
}

function getXsrfToken(doc) {
  try {
    var cookie =
      (doc && doc.cookie) ||
      (typeof document !== "undefined" && document.cookie) ||
      "";
    var match = cookie.match(/XSRF-TOKEN=([^;]+)/);
    return match ? decodeURIComponent(match[1]) : "";
  } catch (e) {
    return "";
  }
}

async function requestJson(url, options) {
  options = options || {};
  var headers = Object.assign({}, JSON_HEADERS, options.headers || {});
  var request = {
    headers: headers,
  };
  if (options.method) {
    request.method = options.method;
  }
  if (options.body !== undefined) {
    request.body = options.body;
  }
  var response = await ZU.request(url, request);
  var body = response && response.body;
  if (typeof body === "string") {
    return JSON.parse(body);
  }
  return body;
}

async function fetchListJson(pageUrl) {
  var listId = getListId(pageUrl);
  if (!listId) {
    throw new Error("LEGANTO-CUSTOM: No list id in URL " + pageUrl);
  }
  var url = apiUrl(pageUrl, "/leganto/rl/main/lists/" + listId);
  safeLog("LEGANTO-CUSTOM: fetchListJson", url);
  var data = await requestJson(url);
  if (!data || !data.object) {
    throw new Error("LEGANTO-CUSTOM: List API returned no object");
  }
  return data.object;
}

function collectCitationIds(list) {
  var ids = [];
  var sections = (list && list.sections) || [];
  for (var i = 0; i < sections.length; i++) {
    var citations = sections[i].citations || [];
    for (var j = 0; j < citations.length; j++) {
      if (citations[j] && citations[j].id && !citations[j].hide) {
        ids.push(String(citations[j].id));
      }
    }
  }
  return ids;
}

function collectSectionIds(list) {
  var ids = [];
  var sections = (list && list.sections) || [];
  for (var i = 0; i < sections.length; i++) {
    if (sections[i] && sections[i].id) {
      ids.push(String(sections[i].id));
    }
  }
  return ids;
}

async function fetchAdditionalInfo(pageUrl, doc, list) {
  var listId = getListId(pageUrl);
  if (!listId) {
    return { citations: {}, sections: {} };
  }
  var token = getXsrfToken(doc);
  var url = apiUrl(
    pageUrl,
    "/leganto/rl/main/lists/" + listId + "/additionalinfo",
  );
  try {
    var data = await requestJson(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-XSRF-TOKEN": token,
      },
      body: JSON.stringify({
        citations: collectCitationIds(list),
        sections: collectSectionIds(list),
      }),
    });
    return data || { citations: {}, sections: {} };
  } catch (error) {
    safeLog("LEGANTO-CUSTOM: additionalinfo failed", error);
    return { citations: {}, sections: {} };
  }
}

async function fetchPublicTags(pageUrl) {
  try {
    var data = await requestJson(
      apiUrl(pageUrl, "/leganto/rl/tags/tagsTablesOptions"),
    );
    return (data && data.CITATION && data.CITATION.PUBLIC) || [];
  } catch (error) {
    safeLog("LEGANTO-CUSTOM: tagsTablesOptions failed", error);
    return [];
  }
}

function citationTags(additional, citationId) {
  var entry =
    additional &&
    additional.citations &&
    additional.citations[String(citationId)];
  var tags =
    (entry && entry.citationData && entry.citationData.tags) ||
    (entry && entry.tags) ||
    [];
  return tags;
}

function firstPublicTag(additional, citationId) {
  var tags = citationTags(additional, citationId);
  for (var i = 0; i < tags.length; i++) {
    var code = tags[i].tagCode || tags[i].tagText || tags[i].code;
    if (code) {
      return String(code);
    }
  }
  return undefined;
}

function buildPriorities(publicTags, additional) {
  var byId = {};
  for (var i = 0; i < publicTags.length; i++) {
    var tag = publicTags[i];
    var id = tag.code || tag.description;
    if (!id) {
      continue;
    }
    byId[id] = {
      id: String(id),
      name: tag.description || String(id),
      color: PRIORITY_COLORS[id] || PRIORITY_COLORS[tag.description] || "#AAA",
      order: typeof tag.order === "number" ? tag.order + 1 : i + 1,
    };
  }
  var citations = (additional && additional.citations) || {};
  Object.keys(citations).forEach(function (citationId) {
    var tags = citationTags(additional, citationId);
    for (var j = 0; j < tags.length; j++) {
      var code = tags[j].tagCode || tags[j].tagText;
      if (code && !byId[code]) {
        byId[code] = {
          id: String(code),
          name: tags[j].tagText || String(code),
          color: PRIORITY_COLORS[code] || "#AAA",
          order: Object.keys(byId).length + 1,
        };
      }
    }
  });
  return Object.keys(byId)
    .map(function (id) {
      return byId[id];
    })
    .sort(function (a, b) {
      return a.order - b.order;
    });
}

function isoDate(value) {
  if (!value) {
    return null;
  }
  var match = String(value).match(/^(\d{4}-\d{2}-\d{2})/);
  return match ? match[1] : null;
}

function sectionReadingDate(section) {
  return (
    isoDate(section.startDate) ||
    isoDate(section.start_date) ||
    isoDate(section.endDate) ||
    isoDate(section.end_date) ||
    null
  );
}

function isNoteCitation(citation) {
  var type = String(
    (citation && (citation.secondaryType || citation.type)) || "",
  ).toUpperCase();
  return type === "NOTE" || type === "NT";
}

function visibleCitations(section) {
  var citations = (section && section.citations) || [];
  return citations.filter(function (citation) {
    return citation && citation.id && !citation.hide && !isNoteCitation(citation);
  });
}

function noteTexts(section) {
  var citations = (section && section.citations) || [];
  var notes = [];
  for (var i = 0; i < citations.length; i++) {
    if (!isNoteCitation(citations[i])) {
      continue;
    }
    var title =
      (citations[i].dc && citations[i].dc.title) || citations[i].publicNote;
    if (title) {
      notes.push(String(title).trim());
    }
  }
  return notes;
}

function constructExportSyllabusMetadata(pageUrl, list, additional, publicTags) {
  var metadata = {
    collectionTitle: list.name || undefined,
    description: list.description || undefined,
    classes: {},
    links: pageUrl ? [pageUrl] : [],
  };
  var course = (list.courses && list.courses[0]) || null;
  if (course && course.code) {
    metadata.courseCode = course.code;
  }
  if (course && course.name && !metadata.collectionTitle) {
    metadata.collectionTitle = course.name;
  }
  var institution =
    list.institutionName ||
    (list.institution && list.institution.name) ||
    undefined;
  if (institution) {
    metadata.institution = institution;
  }

  var priorities = buildPriorities(publicTags, additional);
  if (priorities.length) {
    metadata.priorities = priorities;
  }

  var sections = (list.sections || [])
    .slice()
    .sort(function (a, b) {
      return (a.order || 0) - (b.order || 0);
    });
  var classNumber = 1;
  for (var i = 0; i < sections.length; i++) {
    var section = sections[i];
    var citations = visibleCitations(section);
    var notes = noteTexts(section);
    var itemOrder = citations.map(function (citation) {
      return citationToAssignmentId(citation.id);
    });
    var description = section.description || "";
    if (notes.length) {
      description = [description, notes.join("\n")].filter(Boolean).join("\n\n");
    }
    if (!section.name && !itemOrder.length) {
      continue;
    }
    var classObj = {};
    if (section.name) {
      classObj.title = section.name;
    }
    if (description) {
      classObj.description = description;
    }
    if (itemOrder.length) {
      classObj.itemOrder = itemOrder;
    }
    var readingDate = sectionReadingDate(section);
    if (readingDate) {
      classObj.readingDate = readingDate;
    }
    metadata.classes[String(classNumber)] = classObj;
    classNumber += 1;
  }
  return metadata;
}

async function getSearchResults(pageUrl) {
  var list = await fetchListJson(pageUrl);
  var items = {};
  var sections = (list.sections || [])
    .slice()
    .sort(function (a, b) {
      return (a.order || 0) - (b.order || 0);
    });
  for (var i = 0; i < sections.length; i++) {
    var section = sections[i];
    var citations = visibleCitations(section);
    for (var j = 0; j < citations.length; j++) {
      var citation = citations[j];
      var title = ((citation.dc && citation.dc.title) || "Untitled").trim();
      if (section.name) {
        title = section.name + ": " + title;
      }
      items[String(citation.id)] = title;
    }
  }
  return { items: items, list: list };
}

function mapItemType(citation) {
  var type = String(
    (citation && (citation.secondaryType || citation.type)) || "",
  ).toUpperCase();
  var map = {
    BK: "book",
    E_BK: "book",
    BK_C: "bookSection",
    E_CR: "bookSection",
    CR: "journalArticle",
    JR: "journalArticle",
    ARTICLE: "journalArticle",
    WS: "webpage",
    BL: "webpage",
    VD: "videoRecording",
    AR: "audioRecording",
    TH: "thesis",
    MP: "map",
    PATENT: "patent",
    CP: "conferencePaper",
    CONFERENCE: "conferencePaper",
    TEC_REP: "report",
    WORK_PAPER: "report",
    PRESENTATION: "presentation",
    WEB_SITE: "webpage",
  };
  return map[type] || "journalArticle";
}

function firstValue(value) {
  if (!value) {
    return "";
  }
  return String(value).split(";")[0].trim();
}

function addCreator(item, name, creatorType) {
  if (!name) {
    return;
  }
  var cleaned = String(name).trim().replace(/,$/, "");
  if (!cleaned) {
    return;
  }
  var useComma = cleaned.indexOf(",") !== -1;
  try {
    var creator = ZU.cleanAuthor(cleaned, creatorType || "author", useComma);
    if (creator && (creator.lastName || creator.firstName)) {
      item.creators.push(creator);
    }
  } catch (e) {
    item.creators.push({ lastName: cleaned, creatorType: creatorType || "author", fieldMode: 1 });
  }
}

function parseCreators(item, dc, itemType) {
  var chapterType = itemType === "bookSection";
  var editorType = itemType === "book" ? "editor" : "author";
  var blobs = [];
  if (chapterType && dc.rlterms_chapterAuthor) {
    blobs.push({ value: dc.rlterms_chapterAuthor, type: "author" });
    if (dc.creator) {
      blobs.push({ value: dc.creator, type: "bookAuthor" });
    }
  } else if (dc.creator) {
    blobs.push({ value: dc.creator, type: "author" });
  }
  if (dc.rlterms_additionalPersonName) {
    blobs.push({ value: dc.rlterms_additionalPersonName, type: "author" });
  }
  if (dc.editor) {
    blobs.push({ value: dc.editor, type: editorType });
  }

  for (var i = 0; i < blobs.length; i++) {
    var pieces = String(blobs[i].value).split(";");
    for (var j = 0; j < pieces.length; j++) {
      var piece = pieces[j].trim();
      if (!piece) {
        continue;
      }
      var pairRe = /([^,]+),\s*([^,]+?)(?:,\s*|$)/g;
      var pairCount = 0;
      var match;
      var names = [];
      while ((match = pairRe.exec(piece))) {
        pairCount += 1;
        names.push((match[1] + ", " + match[2]).trim());
      }
      if (pairCount > 1) {
        for (var k = 0; k < names.length; k++) {
          addCreator(item, names[k], blobs[i].type);
        }
      } else {
        addCreator(item, piece, blobs[i].type);
      }
    }
  }
}

function classInstructionForCitation(citation) {
  var parts = [];
  var publicNote =
    citation.publicNote ||
    citation.public_note ||
    (citation.dc && citation.dc.rlterms_studentNote);
  if (publicNote) {
    parts.push(String(publicNote).trim());
  }
  var dc = citation.dc || {};
  if (dc.rlterms_chapter || dc.chapter_title || dc.rlterms_chapterTitle) {
    var chapterBits = [
      dc.chapter_title || dc.rlterms_chapterTitle,
      dc.rlterms_chapter ? "ch. " + dc.rlterms_chapter : "",
    ].filter(Boolean);
    if (chapterBits.length) {
      parts.push(chapterBits.join(", "));
    }
  }
  var start = dc.start_page;
  var end = dc.end_page;
  if (start || end) {
    parts.push("pp. " + [start, end].filter(Boolean).join("-"));
  }
  return parts.filter(Boolean).join("\n\n") || undefined;
}

function findClassNumber(list, citationId) {
  var sections = (list.sections || [])
    .slice()
    .sort(function (a, b) {
      return (a.order || 0) - (b.order || 0);
    });
  var classNumber = 1;
  for (var i = 0; i < sections.length; i++) {
    var citations = visibleCitations(sections[i]);
    if (!sections[i].name && !citations.length) {
      continue;
    }
    for (var j = 0; j < citations.length; j++) {
      if (String(citations[j].id) === String(citationId)) {
        return classNumber;
      }
    }
    classNumber += 1;
  }
  return undefined;
}

function findCitation(list, citationId) {
  var sections = list.sections || [];
  for (var i = 0; i < sections.length; i++) {
    var citations = sections[i].citations || [];
    for (var j = 0; j < citations.length; j++) {
      if (String(citations[j].id) === String(citationId)) {
        return citations[j];
      }
    }
  }
  return null;
}

function institutionFromDoc(doc) {
  if (!doc || !doc.querySelector) {
    return undefined;
  }
  var img = doc.querySelector(
    'img[alt*="Institution"], img[alt*="institution"]',
  );
  if (!img || !img.alt) {
    return undefined;
  }
  return img.alt
    .replace(/^Back to Find Lists page\s*-?\s*/i, "")
    .replace(/\s*Institution logo$/i, "")
    .trim();
}

function populateItem(item, citation, pageUrl, itemType) {
  var dc = citation.dc || {};
  item.title = (dc.title || "").trim();
  parseCreators(item, dc, itemType);
  var date = dc.rlterms_year || dc.year || dc.date;
  if (date) {
    item.date = String(date).replace(/\.$/, "");
  }
  if (dc.publisher) {
    item.publisher = dc.publisher;
  }
  if (dc.rlterms_placeOfPublication) {
    item.place = String(dc.rlterms_placeOfPublication).replace(/\s*:\s*$/, "");
  }
  if (dc.rlterms_edition) {
    item.edition = dc.rlterms_edition;
  }
  var isbn = firstValue(dc.identifier_isbn || dc.isbn);
  if (isbn) {
    item.ISBN = isbn;
  }
  var issn = firstValue(dc.identifier_issn || dc.issn);
  if (issn) {
    item.ISSN = issn;
  }
  if (dc.doi) {
    item.DOI = String(dc.doi).replace(/^https?:\/\/doi\.org\//i, "");
  }
  if (dc.rlterms_journalTitle) {
    item.publicationTitle = dc.rlterms_journalTitle;
  }
  if (dc.rlterms_volumePartNumber || dc.volume) {
    item.volume = dc.rlterms_volumePartNumber || dc.volume;
  }
  if (dc.rlterms_issue || dc.issue) {
    item.issue = dc.rlterms_issue || dc.issue;
  }
  if (dc.start_page || dc.end_page || dc.rlterms_pages) {
    if (dc.start_page || dc.end_page) {
      item.pages = [dc.start_page, dc.end_page].filter(Boolean).join("-");
    } else if (
      dc.rlterms_pages &&
      !/^1 (electronic|online)/i.test(dc.rlterms_pages)
    ) {
      item.pages = dc.rlterms_pages;
    }
  }
  if (dc.rlterms_seriesTitleNumber) {
    item.series = dc.rlterms_seriesTitleNumber;
  }
  if (itemType === "bookSection") {
    if (dc.rlterms_journalTitle) {
      item.bookTitle = dc.rlterms_journalTitle;
    }
    if (dc.chapter_title && !item.title) {
      item.title = dc.chapter_title;
    }
  }
  var url = dc.source;
  if (url && /^https?:\/\//i.test(url) && url.indexOf("uresolver") === -1) {
    item.url = url;
  } else if (pageUrl) {
    item.url = pageUrl.replace(/[?#].*$/, "") + (pageUrl.indexOf("?") === -1 ? "?" : "&") + "citationId=" + citation.id;
  }
  if (dc.language) {
    item.language = dc.language;
  }
  item.libraryCatalog = "Ex Libris Leganto";
  if (dc.rlterms_note) {
    item.notes.push({ note: dc.rlterms_note });
  }
}

function isHttpUrl(value) {
  return typeof value === "string" && /^https?:\/\//i.test(value.trim());
}

function looksLikeFileUrl(url) {
  return /\.(pdf|epub|docx?|pptx?|txt)(\?|#|$)/i.test(url);
}

function isClaOrDigitizedUrl(url) {
  return /contentstore\.cla\.co\.uk|\/link-shib\b|digitool|\/dcs\b/i.test(url);
}

function isSkippableDownloadUrl(url, pageUrl) {
  if (!isHttpUrl(url)) {
    return true;
  }
  if (/\.(png|jpe?g|gif|svg|webp|ico|css|js)(\?|#|$)/i.test(url)) {
    return true;
  }
  if (/google-analytics|doubleclick|facebook\.com|twitter\.com/i.test(url)) {
    return true;
  }
  try {
    var page = new URL(pageUrl);
    var candidate = new URL(url);
    if (
      candidate.origin === page.origin &&
      /\/leganto\/nui\//.test(candidate.pathname)
    ) {
      return true;
    }
  } catch (e) {
    // Keep the URL if it cannot be parsed against the page origin.
  }
  return false;
}

function rankDownloadUrl(url) {
  if (isClaOrDigitizedUrl(url)) {
    return 0;
  }
  if (looksLikeFileUrl(url) || /\/(file|files|download|pdf)\b/i.test(url)) {
    return 1;
  }
  if (/leganto|exlibris/i.test(url) && url.indexOf("uresolver") === -1) {
    return 2;
  }
  if (url.indexOf("uresolver") !== -1) {
    return 4;
  }
  return 3;
}

function collectUrlStrings(value, into, depth) {
  if (depth > 5 || value == null) {
    return;
  }
  if (typeof value === "string") {
    if (isHttpUrl(value)) {
      into.push(value.trim());
    }
    return;
  }
  if (Array.isArray(value)) {
    for (var i = 0; i < value.length; i++) {
      collectUrlStrings(value[i], into, depth + 1);
    }
    return;
  }
  if (typeof value === "object") {
    var keys = Object.keys(value);
    for (var j = 0; j < keys.length; j++) {
      var key = keys[j];
      if (
        /url|link|file|source|pdf|download|href|dcs|open_?url|electronic|availab|view.?it|get.?it/i.test(
          key,
        )
      ) {
        collectUrlStrings(value[key], into, depth + 1);
      }
    }
  }
}

function citationCandidateUrls(pageUrl, citation, additional, details, doc) {
  var urls = [];
  var citationId = citation && citation.id;
  if (citationId) {
    urls.push(apiUrl(pageUrl, "/leganto/rl/citation/" + citationId + "/file"));
    urls.push(
      apiUrl(pageUrl, "/leganto/rl/main/citations/" + citationId + "/file"),
    );
    urls.push(
      apiUrl(pageUrl, "/leganto/rl/citation/" + citationId + "/download"),
    );
  }
  collectUrlStrings(citation, urls, 0);
  var extra =
    additional &&
    additional.citations &&
    additional.citations[String(citation.id)];
  collectUrlStrings(extra, urls, 0);
  collectUrlStrings(details, urls, 0);
  if (details && details.object) {
    collectUrlStrings(details.object, urls, 0);
  }
  var explicit = [
    details && details.file_link,
    details && details.link_to_pdf,
    details && details.fileLink,
    details && details.linkToPdf,
    citation && citation.file_link,
    citation && citation.link_to_pdf,
  ];
  for (var e = 0; e < explicit.length; e++) {
    if (isHttpUrl(explicit[e])) {
      urls.push(String(explicit[e]).trim());
    }
  }
  if (doc && doc.querySelectorAll) {
    var anchors = doc.querySelectorAll("a[href]");
    for (var a = 0; a < anchors.length; a++) {
      var href = anchors[a].href;
      if (isHttpUrl(href)) {
        urls.push(href);
      }
    }
  }
  var seen = {};
  var unique = [];
  for (var i = 0; i < urls.length; i++) {
    var url = urls[i];
    if (seen[url] || isSkippableDownloadUrl(url, pageUrl)) {
      continue;
    }
    seen[url] = true;
    unique.push(url);
  }
  unique.sort(function (left, right) {
    return rankDownloadUrl(left) - rankDownloadUrl(right);
  });
  return unique.slice(0, 10);
}

async function fetchCitationDetails(pageUrl, citationId) {
  var paths = [
    "/leganto/rl/main/citations/" + citationId,
    "/leganto/rl/citation/" + citationId,
    "/leganto/rl/main/citations/" + citationId + "/full",
  ];
  for (var i = 0; i < paths.length; i++) {
    try {
      var data = await requestJson(apiUrl(pageUrl, paths[i]));
      if (data && (data.object || data.id || data.file_link || data.link_to_pdf)) {
        return data.object || data;
      }
    } catch (error) {
      safeLog("LEGANTO-CUSTOM: citation details failed", paths[i], error);
    }
  }
  return null;
}

function headerValue(headers, name) {
  if (!headers) {
    return "";
  }
  if (typeof headers === "string") {
    var match = headers.match(new RegExp("^" + name + ":\\s*(.*)$", "im"));
    return match ? match[1].trim() : "";
  }
  var lower = name.toLowerCase();
  var keys = Object.keys(headers);
  for (var i = 0; i < keys.length; i++) {
    if (keys[i].toLowerCase() === lower) {
      return String(headers[keys[i]] || "").trim();
    }
  }
  return "";
}

function bytesFromResponseBody(body) {
  if (!body) {
    return null;
  }
  if (body instanceof ArrayBuffer) {
    return new Uint8Array(body);
  }
  if (body.buffer instanceof ArrayBuffer) {
    return new Uint8Array(body.buffer, body.byteOffset || 0, body.byteLength);
  }
  if (typeof body === "string") {
    var bytes = new Uint8Array(body.length);
    for (var i = 0; i < body.length; i++) {
      bytes[i] = body.charCodeAt(i) & 0xff;
    }
    return bytes;
  }
  return null;
}

function looksLikePdfBytes(bytes) {
  return (
    bytes &&
    bytes.length >= 4 &&
    bytes[0] === 0x25 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x44 &&
    bytes[3] === 0x46
  );
}

function looksLikeHtmlBytes(bytes) {
  if (!bytes || bytes.length < 5) {
    return false;
  }
  var start = "";
  var n = Math.min(bytes.length, 256);
  for (var i = 0; i < n; i++) {
    start += String.fromCharCode(bytes[i]);
  }
  start = start.replace(/^\uFEFF/, "").trim().toLowerCase();
  return (
    start.indexOf("<!") === 0 ||
    start.indexOf("<html") === 0 ||
    start.indexOf("<head") === 0 ||
    start.indexOf("<script") === 0 ||
    start.indexOf("<p") === 0 ||
    start.indexOf("<div") === 0 ||
    start.indexOf("please wait") !== -1 ||
    start.indexOf("digital content store") !== -1
  );
}

function filenameFromUrl(url, ext) {
  try {
    var path = new URL(url).pathname.split("/").pop() || "";
    if (/\.(pdf|epub)$/i.test(path)) {
      return path;
    }
  } catch (e) {
    // Fall through to a generated name.
  }
  return "reading." + ext;
}

function bytesToBase64(bytes) {
  var binary = "";
  var chunk = 0x8000;
  for (var i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

function titleForDownloadUrl(url, contentType) {
  if (isClaOrDigitizedUrl(url)) {
    return "CLA / digitized PDF";
  }
  if (contentType && contentType.indexOf("epub") !== -1) {
    return "Full Text EPUB";
  }
  return "Full Text PDF";
}

function bytesToUtf8(bytes) {
  var slice = bytes.length > 200000 ? bytes.subarray(0, 200000) : bytes;
  try {
    return new TextDecoder("utf-8").decode(slice);
  } catch (e) {
    var text = "";
    for (var i = 0; i < slice.length; i++) {
      text += String.fromCharCode(slice[i]);
    }
    return text;
  }
}

function unescapeHtmlAttr(value) {
  return String(value || "")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function absolutizeUrl(url, baseUrl) {
  try {
    return new URL(url, baseUrl).href;
  } catch (e) {
    return "";
  }
}

function isLoginOrIdpUrl(url) {
  if (isClaOrDigitizedUrl(url)) {
    return false;
  }
  return /\/login\b|\/signin\b|saml|oauth|microsoftonline|accounts\.google|idp\.|shibboleth/i.test(
    url,
  );
}

function addCandidateUrl(into, raw, baseUrl) {
  if (!raw) {
    return;
  }
  var abs = absolutizeUrl(unescapeHtmlAttr(String(raw).trim()), baseUrl);
  if (!isHttpUrl(abs) || into.indexOf(abs) !== -1 || isLoginOrIdpUrl(abs)) {
    return;
  }
  into.push(abs);
}

function extractRedirectUrls(html, baseUrl) {
  var urls = [];
  var metaRefresh = html.match(
    /http-equiv\s*=\s*["']?refresh["'][^>]*content\s*=\s*["']?\s*\d*\s*;\s*url\s*=\s*([^"'>\s]+)/i,
  );
  if (!metaRefresh) {
    metaRefresh = html.match(
      /content\s*=\s*["']?\s*\d+\s*;\s*url\s*=\s*([^"'>]+)["'][^>]*http-equiv\s*=\s*["']?refresh/i,
    );
  }
  if (metaRefresh) {
    addCandidateUrl(urls, metaRefresh[1], baseUrl);
  }
  var locRe =
    /(?:window\.)?location(?:\.href|\.replace)?\s*=\s*["']([^"']+)["']/gi;
  var locMatch;
  while ((locMatch = locRe.exec(html))) {
    addCandidateUrl(urls, locMatch[1], baseUrl);
  }
  var replaceRe = /location\.(?:replace|assign)\(\s*["']([^"']+)["']/gi;
  while ((locMatch = replaceRe.exec(html))) {
    addCandidateUrl(urls, locMatch[1], baseUrl);
  }
  var iframeRe =
    /<(?:iframe|embed|object|source)[^>]+(?:src|data)\s*=\s*["']([^"']+)["']/gi;
  while ((locMatch = iframeRe.exec(html))) {
    addCandidateUrl(urls, locMatch[1], baseUrl);
  }
  var jsonRe =
    /"(?:redirectUrl|returnUrl|destination|targetUrl|downloadUrl|fileUrl|url)"\s*:\s*"([^"]+)"/gi;
  while ((locMatch = jsonRe.exec(html))) {
    addCandidateUrl(urls, locMatch[1], baseUrl);
  }
  var hrefRe = /<a[^>]+href\s*=\s*["']([^"']+)["']/gi;
  while ((locMatch = hrefRe.exec(html))) {
    var href = locMatch[1];
    if (
      looksLikeFileUrl(href) ||
      isClaOrDigitizedUrl(href) ||
      /\/(file|files|download|pdf)\b/i.test(href)
    ) {
      addCandidateUrl(urls, href, baseUrl);
    }
  }
  return urls;
}

function extractAutoPost(html, baseUrl) {
  if (/type\s*=\s*["']password["']/i.test(html)) {
    return null;
  }
  var formMatch = html.match(
    /<form[^>]*method\s*=\s*["']post["'][^>]*action\s*=\s*["']([^"']+)["'][^>]*>([\s\S]*?)<\/form>/i,
  );
  if (!formMatch) {
    formMatch = html.match(
      /<form[^>]*action\s*=\s*["']([^"']+)["'][^>]*method\s*=\s*["']post["'][^>]*>([\s\S]*?)<\/form>/i,
    );
  }
  if (!formMatch) {
    return null;
  }
  var action = absolutizeUrl(unescapeHtmlAttr(formMatch[1]), baseUrl);
  if (!isHttpUrl(action)) {
    return null;
  }
  var fields = [];
  var inputRe = /<input[^>]*>/gi;
  var inputMatch;
  while ((inputMatch = inputRe.exec(formMatch[2]))) {
    var tag = inputMatch[0];
    var nameMatch = tag.match(/\bname\s*=\s*["']([^"']+)["']/i);
    var valueMatch = tag.match(/\bvalue\s*=\s*["']([^"']*)["']/i);
    if (nameMatch) {
      fields.push(
        encodeURIComponent(unescapeHtmlAttr(nameMatch[1])) +
          "=" +
          encodeURIComponent(unescapeHtmlAttr(valueMatch ? valueMatch[1] : "")),
      );
    }
  }
  if (!fields.length) {
    return null;
  }
  return { url: action, body: fields.join("&") };
}

function fileFromBytes(url, bytes, contentType) {
  if (looksLikePdfBytes(bytes) || /pdf/i.test(contentType || "")) {
    return {
      bytes: bytes,
      contentType: "application/pdf",
      filename: filenameFromUrl(url, "pdf"),
    };
  }
  if (/epub/i.test(contentType || "")) {
    return {
      bytes: bytes,
      contentType: "application/epub+zip",
      filename: filenameFromUrl(url, "epub"),
    };
  }
  return null;
}

async function tryDownloadFile(url, hop, seen) {
  hop = hop || 0;
  seen = seen || {};
  if (hop > 6 || seen[url]) {
    return null;
  }
  seen[url] = true;
  try {
    var response = await ZU.request(url, {
      headers: {
        Accept:
          "application/pdf,application/epub+zip,application/octet-stream,text/html,*/*",
      },
      timeout: 20000,
      responseType: "arraybuffer",
    });
    var status = response && response.status;
    if (status && status >= 400) {
      return null;
    }
    var headers = response && (response.headers || response.responseHeaders);
    var contentType = headerValue(headers, "content-type").toLowerCase();
    var bytes = bytesFromResponseBody(response && response.body);
    if (!bytes || bytes.length < 5) {
      return null;
    }
    var asFile = fileFromBytes(url, bytes, contentType);
    if (asFile) {
      return asFile;
    }
    var html =
      looksLikeHtmlBytes(bytes) ||
      /text\/html|application\/xhtml|application\/json|text\/plain/.test(
        contentType,
      )
        ? bytesToUtf8(bytes)
        : "";
    if (!html) {
      return null;
    }
    var nextUrls = extractRedirectUrls(html, url);
    var refreshHeader = headerValue(headers, "refresh");
    if (refreshHeader) {
      var refreshUrl = refreshHeader.match(/url\s*=\s*([^\s;]+)/i);
      if (refreshUrl) {
        addCandidateUrl(nextUrls, refreshUrl[1], url);
      }
    }
    var responseUrl = response.responseURL || response.url;
    if (responseUrl && responseUrl !== url) {
      addCandidateUrl(nextUrls, responseUrl, url);
    }
    if (nextUrls.length) {
      safeLog("LEGANTO-CUSTOM: following redirect", url, "->", nextUrls[0]);
    }
    for (var i = 0; i < nextUrls.length; i++) {
      var file = await tryDownloadFile(nextUrls[i], hop + 1, seen);
      if (file) {
        return file;
      }
    }
    var autoPost = extractAutoPost(html, url);
    if (autoPost && !seen[autoPost.url + " POST"]) {
      seen[autoPost.url + " POST"] = true;
      safeLog("LEGANTO-CUSTOM: following auto-post", url, "->", autoPost.url);
      var posted = await ZU.request(autoPost.url, {
        method: "POST",
        headers: {
          Accept:
            "application/pdf,application/epub+zip,application/octet-stream,text/html,*/*",
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: autoPost.body,
        timeout: 20000,
        responseType: "arraybuffer",
      });
      var postedBytes = bytesFromResponseBody(posted && posted.body);
      var postedType = headerValue(
        posted && (posted.headers || posted.responseHeaders),
        "content-type",
      ).toLowerCase();
      var postedFile = fileFromBytes(autoPost.url, postedBytes, postedType);
      if (postedFile) {
        return postedFile;
      }
      if (postedBytes && looksLikeHtmlBytes(postedBytes)) {
        var postedHtml = bytesToUtf8(postedBytes);
        var postedNext = extractRedirectUrls(postedHtml, autoPost.url);
        for (var j = 0; j < postedNext.length; j++) {
          var afterPost = await tryDownloadFile(postedNext[j], hop + 1, seen);
          if (afterPost) {
            return afterPost;
          }
        }
      }
    }
    if (
      hop === 0 &&
      isClaOrDigitizedUrl(url) &&
      typeof ZU.processDocuments === "function"
    ) {
      try {
        safeLog("LEGANTO-CUSTOM: loading wait page in hidden browser", url);
        var loadedDoc = await new Promise(function (resolve) {
          var settled = false;
          var timer = setTimeout(function () {
            if (!settled) {
              settled = true;
              resolve(null);
            }
          }, 15000);
          ZU.processDocuments(
            url,
            function (doc) {
              if (settled) {
                return;
              }
              settled = true;
              clearTimeout(timer);
              resolve(doc);
            },
            true,
          );
        });
        if (loadedDoc) {
          var loadedUrl =
            (loadedDoc.location && loadedDoc.location.href) ||
            loadedDoc.documentURI ||
            "";
          if (loadedUrl && loadedUrl !== url) {
            var fromBrowser = await tryDownloadFile(loadedUrl, hop + 1, seen);
            if (fromBrowser) {
              return fromBrowser;
            }
          }
          var embed = loadedDoc.querySelector(
            "iframe[src], embed[src], object[data], a[href$='.pdf']",
          );
          if (embed) {
            var src =
              embed.src ||
              embed.href ||
              embed.getAttribute("data") ||
              embed.getAttribute("href");
            if (src) {
              var fromEmbed = await tryDownloadFile(
                absolutizeUrl(src, loadedUrl || url),
                hop + 1,
                seen,
              );
              if (fromEmbed) {
                return fromEmbed;
              }
            }
          }
        }
      } catch (browserError) {
        safeLog("LEGANTO-CUSTOM: wait-page browser load failed", browserError);
      }
    }
    return null;
  } catch (error) {
    safeLog("LEGANTO-CUSTOM: download failed", url, error);
    return null;
  }
}

async function attachCitationFiles(
  item,
  pageUrl,
  citation,
  additional,
  details,
  doc,
) {
  if (!item.attachments) {
    item.attachments = [];
  }
  var citationId = String((citation && citation.id) || "");
  var urls = citationCandidateUrls(
    pageUrl,
    citation,
    additional,
    details,
    doc,
  );
  safeLog(
    "LEGANTO-CUSTOM: trying",
    urls.length,
    "links for citation",
    citationId,
  );
  var stored = 0;
  for (var i = 0; i < urls.length && stored < 3; i++) {
    var file = await tryDownloadFile(urls[i]);
    if (!file) {
      continue;
    }
    var title = titleForDownloadUrl(urls[i], file.contentType);
    var stashed = false;
    if (citationId) {
      stashed = await stashReadingListFile({
        citationId: citationId,
        title: title,
        contentType: file.contentType,
        filename: file.filename,
        data: bytesToBase64(file.bytes),
      });
    }
    if (stashed) {
      stored++;
      continue;
    }
    item.attachments.push({
      title: title,
      url: urls[i],
      mimeType: file.contentType,
    });
    stored++;
  }
}

async function postToZoteroLocal(endpoint, body) {
  var baseUrl = "http://127.0.0.1:23119";
  var url = baseUrl + endpoint;
  var headers = {
    "X-Zotero-Version": Zotero.version,
    "X-Zotero-Connector-API-Version": 3,
    "Zotero-Allowed-Request": "1",
    "Content-Type": "application/json",
  };
  var response = await ZU.request(url, {
    method: "POST",
    headers: headers,
    body: JSON.stringify(body),
  });
  return response && response.body;
}

async function stashReadingListFile(payload) {
  try {
    var body = await postToZoteroLocal(
      "/syllabus/stashReadingListFile",
      payload,
    );
    var parsed = typeof body === "string" ? JSON.parse(body) : body;
    return !!(parsed && parsed.ok);
  } catch (error) {
    safeLog("LEGANTO-CUSTOM: stash POST failed", error);
    return false;
  }
}

async function setSyllabusMetadata(metadata) {
  return await postToZoteroLocal("/syllabus/setTalisMetadata", {
    metadata: metadata,
  });
}

async function scrape(pageUrl, doc, selectedIds, list) {
  safeLog("LEGANTO-CUSTOM: scraping", selectedIds.length, "items");
  var additional = await fetchAdditionalInfo(pageUrl, doc, list);
  var publicTags = await fetchPublicTags(pageUrl);
  var metadata = constructExportSyllabusMetadata(
    pageUrl,
    list,
    additional,
    publicTags,
  );
  var institution = institutionFromDoc(doc);
  if (institution && !metadata.institution) {
    metadata.institution = institution;
  }
  var syllabusResponseString;
  try {
    syllabusResponseString = await setSyllabusMetadata(metadata);
  } catch (error) {
    safeLog("LEGANTO-CUSTOM: syllabus metadata POST failed", error);
  }
  var syllabusResponse = {};
  try {
    syllabusResponse = syllabusResponseString
      ? JSON.parse(syllabusResponseString)
      : {};
  } catch (e) {
    syllabusResponse = {};
  }
  var collectionKey = syllabusResponse.collectionAndLibraryKey;

  var detailsById = {};
  await Promise.all(
    selectedIds.map(async function (id) {
      detailsById[id] = await fetchCitationDetails(pageUrl, id);
    }),
  );

  for (var i = 0; i < selectedIds.length; i++) {
    var citationId = selectedIds[i];
    var citation = findCitation(list, citationId);
    if (!citation || isNoteCitation(citation)) {
      continue;
    }
    var itemType = mapItemType(citation);
    var item = new Zotero.Item(itemType);
    populateItem(item, citation, pageUrl, itemType);
    var detailsDoc =
      String(getCitationId(pageUrl) || "") === String(citationId) ? doc : null;
    await attachCitationFiles(
      item,
      pageUrl,
      citation,
      additional,
      detailsById[citationId],
      detailsDoc,
    );
    if (collectionKey) {
      var classNumber = findClassNumber(list, citationId);
      var priority = firstPublicTag(additional, citationId);
      var classInstruction = classInstructionForCitation(citation);
      var assignment = {
        id: citationToAssignmentId(citationId),
      };
      if (classNumber) {
        assignment.classNumber = classNumber;
      }
      if (priority) {
        assignment.priority = priority;
      }
      if (classInstruction) {
        assignment.classInstruction = classInstruction;
      }
      var itemSyllabusData = {};
      itemSyllabusData[collectionKey] = [assignment];
      item.extra = "syllabus: " + JSON.stringify(itemSyllabusData);
    }
    item.complete();
  }
}

async function doWeb(doc, url) {
  safeLog("LEGANTO-CUSTOM: doWeb", url);
  var detected = detectWeb(doc, url);
  if (detected === "multiple") {
    var results = await getSearchResults(url);
    var requestedItems = await Zotero.selectItems(results.items);
    if (requestedItems && Object.keys(requestedItems).length > 0) {
      await scrape(url, doc, Object.keys(requestedItems), results.list);
    }
  } else {
    var list = await fetchListJson(url);
    var citationId = getCitationId(url);
    var selected = citationId ? [citationId] : collectCitationIds(list);
    await scrape(url, doc, selected, list);
  }
}

/** BEGIN TEST CASES **/
var testCases = [
  {
    type: "web",
    url: "https://uws-uk.leganto.exlibrisgroup.com/leganto/nui/lists/11705785220003931?institute=44PAI_INST&auth=guest",
    defer: true,
    items: "multiple",
  },
];
/** END TEST CASES **/
