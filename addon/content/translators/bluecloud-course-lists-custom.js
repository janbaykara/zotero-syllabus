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

var PRIORITY_COLORS = {
  Essential: "#8B5CF6",
  Required: "#8B5CF6",
  Mandatory: "#8B5CF6",
  Recommended: "#3B82F6",
  Optional: "#95A5A6",
  Suggested: "#95A5A6",
};

function textContent(node) {
  return node && node.textContent ? String(node.textContent).trim() : "";
}

function isBluecloudUrl(url, doc) {
  var text = String(url || "");
  if (
    /courselists|course-lists|bccl|bluecloudlists|bluecloud[-.]course/i.test(
      text,
    )
  ) {
    return true;
  }
  if (/cloudsource\.(net|org)/i.test(text) && /course.?list/i.test(text)) {
    return true;
  }
  var title = (doc && doc.title) || "";
  if (/BLUEcloud Course Lists/i.test(title)) {
    return true;
  }
  if (/Course Lists/i.test(title) && /sirsidynix|cloudsource/i.test(title)) {
    return true;
  }
  return false;
}

function getListId(url) {
  var text = String(url || "");
  var match =
    text.match(/\/(?:course[-_]?lists?|lists?|student)\/(?:view\/)?(\d+|[A-Za-z0-9-]{6,})/i) ||
    text.match(/[?#&](?:list|listId|list_id|id)=([A-Za-z0-9-]{1,80})/i);
  return match ? match[1] : null;
}

function detectWeb(doc, url) {
  safeLog("BLUECLOUD-CUSTOM: detectWeb", url);
  if (!isBluecloudUrl(url, doc)) {
    return false;
  }
  if (
    getListId(url) ||
    (doc &&
      doc.querySelector &&
      doc.querySelector(
        "[data-resource-id], .resource-card, .list-item, .course-list-item, a[href*='.pdf']",
      ))
  ) {
    return "multiple";
  }
  return false;
}

function citationToAssignmentId(id) {
  var value = String(id || "").replace(/[^A-Za-z0-9._-]/g, "");
  if (!value) {
    return null;
  }
  if (value.indexOf("assignment-") === 0) {
    return value;
  }
  return "assignment-" + value.slice(0, 70);
}

function originFromUrl(url) {
  try {
    return new URL(url).origin;
  } catch (e) {
    return "";
  }
}

async function requestJson(url) {
  var response = await ZU.request(url, {
    headers: { Accept: "application/json, text/plain, */*" },
  });
  var body = response && response.body;
  if (typeof body === "string") {
    try {
      return JSON.parse(body);
    } catch (e) {
      return null;
    }
  }
  return body;
}

function mapItemType(kind) {
  var type = String(kind || "").toLowerCase();
  if (/book.?section|chapter/.test(type)) {
    return "bookSection";
  }
  if (/book|ebook/.test(type)) {
    return "book";
  }
  if (/article|journal/.test(type)) {
    return "journalArticle";
  }
  if (/video|film|youtube/.test(type)) {
    return "videoRecording";
  }
  if (/audio|podcast/.test(type)) {
    return "audioRecording";
  }
  if (/web|site|link/.test(type)) {
    return "webpage";
  }
  return "journalArticle";
}

function addCreator(item, name) {
  if (!name) {
    return;
  }
  var cleaned = String(name).trim();
  if (!cleaned) {
    return;
  }
  try {
    var creator = ZU.cleanAuthor(cleaned, "author", cleaned.indexOf(",") !== -1);
    if (creator && (creator.lastName || creator.firstName)) {
      item.creators.push(creator);
    }
  } catch (e) {
    item.creators.push({
      lastName: cleaned,
      creatorType: "author",
      fieldMode: 1,
    });
  }
}

function firstString() {
  for (var i = 0; i < arguments.length; i++) {
    var value = arguments[i];
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }
  return "";
}

function normalizeListPayload(data, pageUrl) {
  if (!data) {
    return null;
  }
  var root =
    data.list ||
    data.courseList ||
    data.object ||
    (data.data && !Array.isArray(data.data) ? data.data : data);
  var resources =
    root.items ||
    root.resources ||
    root.citations ||
    root.entries ||
    data.items ||
    data.resources ||
    [];
  var sections = root.sections || root.weeks || root.folders || [];
  if (!sections.length && Array.isArray(resources) && resources.length) {
    sections = [{ title: "Readings", items: resources }];
  }
  if (!sections.length) {
    return null;
  }
  var mapped = [];
  var itemsById = {};
  for (var i = 0; i < sections.length; i++) {
    var section = sections[i] || {};
    var entries =
      section.items ||
      section.resources ||
      section.citations ||
      section.entries ||
      [];
    var citations = [];
    for (var j = 0; j < entries.length; j++) {
      var entry = entries[j] || {};
      var id = String(
        entry.id ||
          entry.resourceId ||
          entry.citationId ||
          entry.uuid ||
          i + "-" + j,
      );
      var citation = {
        id: id,
        title:
          firstString(entry.title, entry.name, entry.resourceTitle) ||
          "Untitled",
        authors: entry.authors || entry.author || entry.creator,
        type: entry.type || entry.resourceType || entry.format,
        url: firstString(entry.url, entry.link, entry.href, entry.electronicUrl),
        isbn: entry.isbn || entry.ISBN,
        doi: entry.doi || entry.DOI,
        date: entry.date || entry.year || entry.publicationDate,
        publisher: entry.publisher,
        importance:
          firstString(
            entry.importance,
            entry.priority,
            entry.requiredFlag ? "Required" : "",
            entry.optionalFlag ? "Optional" : "",
            entry.tag,
          ) || undefined,
        note: firstString(entry.note, entry.studentNote, entry.publicNote),
        raw: entry,
      };
      citations.push(citation);
      itemsById[id] = citation;
    }
    mapped.push({
      title: firstString(section.title, section.name, section.week, "Section " + (i + 1)),
      citations: citations,
    });
  }
  return {
    collectionTitle: firstString(
      root.title,
      root.name,
      root.listName,
      root.courseName,
    ),
    courseCode: firstString(root.courseCode, root.code, root.course_code),
    institution: firstString(root.institution, root.libraryName),
    sections: mapped,
    itemsById: itemsById,
    sourceUrl: pageUrl,
  };
}

async function fetchListJson(pageUrl) {
  var listId = getListId(pageUrl);
  var origin = originFromUrl(pageUrl);
  var paths = [];
  if (listId) {
    paths = [
      "/api/lists/" + listId,
      "/api/v1/lists/" + listId,
      "/api/courselists/" + listId,
      "/api/course-lists/" + listId,
      "/courselists/api/lists/" + listId,
      "/student/api/lists/" + listId,
      "/api/student/lists/" + listId,
      "/api/lists/" + listId + "/resources",
    ];
  }
  for (var i = 0; i < paths.length; i++) {
    try {
      var data = await requestJson(origin + paths[i]);
      var normalized = normalizeListPayload(data, pageUrl);
      if (normalized && normalized.sections.length) {
        safeLog("BLUECLOUD-CUSTOM: list JSON from", paths[i]);
        return normalized;
      }
    } catch (error) {
      safeLog("BLUECLOUD-CUSTOM: JSON miss", paths[i], error);
    }
  }
  return null;
}

function queryAll(doc, selector) {
  if (!doc || !doc.querySelectorAll) {
    return [];
  }
  return Array.prototype.slice.call(doc.querySelectorAll(selector));
}

function scrapeListFromDom(doc, pageUrl) {
  var heading =
    (doc.querySelector &&
      (doc.querySelector("h1") || doc.querySelector("[class*='list-title']"))) ||
    null;
  var collectionTitle = textContent(heading) || (doc.title || "").trim();
  var sectionEls = queryAll(
    doc,
    "section, .week, .section, [class*='week'], [class*='section-']",
  );
  if (!sectionEls.length) {
    sectionEls = [doc.body];
  }
  var itemsById = {};
  var sections = [];
  var seenCards = [];
  for (var i = 0; i < sectionEls.length; i++) {
    var sectionEl = sectionEls[i];
    var cards = queryAll(
      sectionEl,
      "[data-resource-id], .resource-card, .list-item, .course-list-item, li.resource, article",
    );
    var citations = [];
    for (var j = 0; j < cards.length; j++) {
      var card = cards[j];
      if (seenCards.indexOf(card) !== -1) {
        continue;
      }
      var titleEl =
        card.querySelector &&
        (card.querySelector("h2, h3, h4, .title, a"));
      var title = textContent(titleEl);
      if (!title || title.length < 3) {
        continue;
      }
      seenCards.push(card);
      var id =
        card.getAttribute &&
        (card.getAttribute("data-resource-id") ||
          card.getAttribute("data-id") ||
          card.getAttribute("id"));
      id = String(id || "dom-" + i + "-" + j).replace(/[^A-Za-z0-9._-]/g, "");
      var href =
        (titleEl && titleEl.href) ||
        (card.querySelector && card.querySelector("a[href]") &&
          card.querySelector("a[href]").href) ||
        "";
      var badge = textContent(
        card.querySelector &&
          card.querySelector(
            ".required, .optional, .recommended, [class*='priority'], [class*='importance']",
          ),
      );
      var citation = {
        id: id || "item-" + Object.keys(itemsById).length,
        title: title,
        url: href,
        importance: badge || undefined,
        type: "",
        raw: {},
      };
      citations.push(citation);
      itemsById[citation.id] = citation;
    }
    if (!citations.length && sectionEls.length > 1) {
      continue;
    }
    var sectionTitle =
      textContent(sectionEl.querySelector && sectionEl.querySelector("h2, h3, .section-title, .week-title")) ||
      (sectionEls.length === 1 ? "Readings" : "Section " + (sections.length + 1));
    sections.push({ title: sectionTitle, citations: citations });
  }
  if (!Object.keys(itemsById).length) {
    return null;
  }
  return {
    collectionTitle: collectionTitle,
    sections: sections,
    itemsById: itemsById,
    sourceUrl: pageUrl,
  };
}

function collectSearchResults(list) {
  var items = {};
  var sections = (list && list.sections) || [];
  for (var i = 0; i < sections.length; i++) {
    var citations = sections[i].citations || [];
    for (var j = 0; j < citations.length; j++) {
      var citation = citations[j];
      var title = citation.title || "Untitled";
      if (sections[i].title) {
        title = sections[i].title + ": " + title;
      }
      items[String(citation.id)] = title;
    }
  }
  return items;
}

function buildPriorities(list) {
  var seen = {};
  var out = [];
  var sections = list.sections || [];
  for (var i = 0; i < sections.length; i++) {
    var citations = sections[i].citations || [];
    for (var j = 0; j < citations.length; j++) {
      var importance = citations[j].importance;
      if (!importance || seen[importance]) {
        continue;
      }
      seen[importance] = true;
      out.push({
        id: String(importance),
        name: String(importance),
        color: PRIORITY_COLORS[importance] || "#AAA",
        order: out.length + 1,
      });
    }
  }
  return out;
}

function constructExportSyllabusMetadata(pageUrl, list) {
  var metadata = {
    collectionTitle: list.collectionTitle || undefined,
    classes: {},
    links: pageUrl ? [pageUrl] : [],
  };
  if (list.courseCode) {
    metadata.courseCode = list.courseCode;
  }
  if (list.institution) {
    metadata.institution = list.institution;
  }
  var priorities = buildPriorities(list);
  if (priorities.length) {
    metadata.priorities = priorities;
  }
  var classNumber = 1;
  var sections = list.sections || [];
  for (var i = 0; i < sections.length; i++) {
    var citations = sections[i].citations || [];
    var itemOrder = citations
      .map(function (citation) {
        return citationToAssignmentId(citation.id);
      })
      .filter(Boolean);
    if (!sections[i].title && !itemOrder.length) {
      continue;
    }
    var classObj = {};
    if (sections[i].title) {
      classObj.title = sections[i].title;
    }
    if (itemOrder.length) {
      classObj.itemOrder = itemOrder;
    }
    metadata.classes[String(classNumber)] = classObj;
    classNumber += 1;
  }
  return metadata;
}

function findClassNumber(list, citationId) {
  var classNumber = 1;
  var sections = list.sections || [];
  for (var i = 0; i < sections.length; i++) {
    var citations = sections[i].citations || [];
    if (!sections[i].title && !citations.length) {
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

function populateItem(item, citation) {
  item.title = citation.title || "Untitled";
  var authors = citation.authors;
  if (typeof authors === "string") {
    authors = authors.split(/\s*;\s*|\s+and\s+/i);
  }
  if (Array.isArray(authors)) {
    for (var i = 0; i < authors.length; i++) {
      var name =
        typeof authors[i] === "string"
          ? authors[i]
          : [authors[i].lastName || authors[i].family, authors[i].firstName || authors[i].given]
              .filter(Boolean)
              .join(", ");
      addCreator(item, name);
    }
  }
  if (citation.date) {
    item.date = String(citation.date);
  }
  if (citation.publisher) {
    item.publisher = citation.publisher;
  }
  if (citation.isbn) {
    item.ISBN = String(citation.isbn);
  }
  if (citation.doi) {
    item.DOI = String(citation.doi).replace(/^https?:\/\/doi\.org\//i, "");
  }
  if (citation.url) {
    item.url = citation.url;
  }
  item.libraryCatalog = "BLUEcloud Course Lists";
}

function isHttpUrl(value) {
  return typeof value === "string" && /^https?:\/\//i.test(value.trim());
}

function looksLikeFileUrl(url) {
  return /\.(pdf|epub|docx?|pptx?|txt)(\?|#|$)/i.test(url);
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

function filenameFromUrl(url, ext) {
  try {
    var path = new URL(url).pathname.split("/").pop() || "";
    if (/\.(pdf|epub)$/i.test(path)) {
      return path;
    }
  } catch (e) {
    // Fall through.
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

async function tryDownloadFile(url) {
  if (!isHttpUrl(url)) {
    return null;
  }
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
    return fileFromBytes(url, bytes, contentType);
  } catch (error) {
    safeLog("BLUECLOUD-CUSTOM: download failed", url, error);
    return null;
  }
}

async function postToZoteroLocal(endpoint, body) {
  var response = await ZU.request("http://127.0.0.1:23119" + endpoint, {
    method: "POST",
    headers: {
      "X-Zotero-Version": Zotero.version,
      "X-Zotero-Connector-API-Version": 3,
      "Zotero-Allowed-Request": "1",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  return response && response.body;
}

async function stashReadingListFile(payload) {
  try {
    var body = await postToZoteroLocal("/syllabus/stashReadingListFile", payload);
    var parsed = typeof body === "string" ? JSON.parse(body) : body;
    return !!(parsed && parsed.ok);
  } catch (error) {
    safeLog("BLUECLOUD-CUSTOM: stash POST failed", error);
    return false;
  }
}

async function setSyllabusMetadata(metadata) {
  return await postToZoteroLocal("/syllabus/setTalisMetadata", {
    metadata: metadata,
  });
}

function collectUrls(citation) {
  var urls = [];
  var push = function (value) {
    if (isHttpUrl(value) && urls.indexOf(value) === -1) {
      urls.push(value);
    }
  };
  push(citation.url);
  var raw = citation.raw || {};
  var keys = Object.keys(raw);
  for (var i = 0; i < keys.length; i++) {
    if (/url|link|file|pdf|download|href/i.test(keys[i])) {
      var value = raw[keys[i]];
      if (typeof value === "string") {
        push(value);
      }
    }
  }
  urls.sort(function (left, right) {
    return (looksLikeFileUrl(left) ? 0 : 1) - (looksLikeFileUrl(right) ? 0 : 1);
  });
  return urls.slice(0, 8);
}

async function attachFiles(item, citation) {
  var urls = collectUrls(citation);
  var stored = 0;
  var citationId = String(citation.id || "").replace(/[^A-Za-z0-9._-]/g, "");
  for (var i = 0; i < urls.length && stored < 3; i++) {
    var file = await tryDownloadFile(urls[i]);
    if (!file) {
      continue;
    }
    var title =
      file.contentType.indexOf("epub") !== -1
        ? "Full Text EPUB"
        : "Full Text PDF";
    var stashed = citationId
      ? await stashReadingListFile({
          citationId: citationId.slice(0, 80),
          title: title,
          contentType: file.contentType,
          filename: file.filename,
          data: bytesToBase64(file.bytes),
        })
      : false;
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

async function scrape(pageUrl, selectedIds, list) {
  safeLog("BLUECLOUD-CUSTOM: scraping", selectedIds.length, "items");
  var metadata = constructExportSyllabusMetadata(pageUrl, list);
  var syllabusResponseString;
  try {
    syllabusResponseString = await setSyllabusMetadata(metadata);
  } catch (error) {
    safeLog("BLUECLOUD-CUSTOM: syllabus metadata POST failed", error);
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

  for (var i = 0; i < selectedIds.length; i++) {
    var citationId = selectedIds[i];
    var citation = list.itemsById[citationId];
    if (!citation) {
      continue;
    }
    var item = new Zotero.Item(mapItemType(citation.type));
    populateItem(item, citation);
    await attachFiles(item, citation);
    if (collectionKey) {
      var assignment = {
        id: citationToAssignmentId(citationId),
      };
      var classNumber = findClassNumber(list, citationId);
      if (classNumber) {
        assignment.classNumber = classNumber;
      }
      if (citation.importance) {
        assignment.priority = citation.importance;
      }
      if (citation.note) {
        assignment.classInstruction = citation.note;
      }
      var itemSyllabusData = {};
      itemSyllabusData[collectionKey] = [assignment];
      item.extra = "syllabus: " + JSON.stringify(itemSyllabusData);
    }
    item.complete();
  }
}

async function doWeb(doc, url) {
  safeLog("BLUECLOUD-CUSTOM: doWeb", url);
  var list = await fetchListJson(url);
  if (!list) {
    list = scrapeListFromDom(doc, url);
  }
  if (!list) {
    throw new Error(
      "BLUECLOUD-CUSTOM: No course list found. Open the student view of the list and try again.",
    );
  }
  var items = collectSearchResults(list);
  var requestedItems = await Zotero.selectItems(items);
  if (requestedItems && Object.keys(requestedItems).length > 0) {
    await scrape(url, Object.keys(requestedItems), list);
  }
}

/** BEGIN TEST CASES **/
var testCases = [];
/** END TEST CASES **/
