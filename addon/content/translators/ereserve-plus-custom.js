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
  required: "#8B5CF6",
  core_reading: "#8B5CF6",
  "Core reading": "#8B5CF6",
  Recommended: "#3B82F6",
  recommended: "#3B82F6",
  Optional: "#95A5A6",
};

function textContent(node) {
  return node && node.textContent ? String(node.textContent).trim() : "";
}

function attr(node, name) {
  if (!node) {
    return "";
  }
  if (typeof node.getAttribute === "function") {
    return node.getAttribute(name) || "";
  }
  return "";
}

function dataset(node, name) {
  if (!node) {
    return "";
  }
  if (node.dataset && node.dataset[name] != null) {
    return String(node.dataset[name]);
  }
  return (
    attr(node, "data-" + name.replace(/[A-Z]/g, function (ch) {
      return "-" + ch.toLowerCase();
    })) || ""
  );
}

function isEreserveUrl(url, doc) {
  var text = String(url || "");
  if (
    /ereserve\.(com\.au|com|org)/i.test(text) ||
    /\/app\/public_lists\b/i.test(text) ||
    /\/app\/integration\/lti\/reading_list/i.test(text)
  ) {
    return true;
  }
  if (!doc) {
    return false;
  }
  if (doc.getElementById && doc.getElementById("selected_reading_list")) {
    return true;
  }
  var config = doc.getElementById && doc.getElementById("frontend-config");
  if (config && /ereserve/i.test(dataset(config, "gqlEndpoint") || attr(config, "data-gql-endpoint"))) {
    return true;
  }
  return false;
}

function getListId(url, doc) {
  var text = String(url || "");
  var match =
    text.match(/\/reading_lists\/(\d+)/i) ||
    text.match(/\/public_lists\/(\d+)/i) ||
    text.match(/\/resource_lists\/(\d+)/i) ||
    text.match(/\/(?:unit\/\d+\/)?list\/(\d+)/i) ||
    text.match(/[?#&](?:list|reading_list|readingList)(?:Id|_id)?=(\d+)/i);
  if (match) {
    return match[1];
  }
  if (doc && doc.getElementById) {
    var listEl = doc.getElementById("selected_reading_list");
    var fromDom =
      dataset(listEl, "listId") ||
      attr(listEl, "data-list-id");
    if (fromDom) {
      return fromDom;
    }
  }
  return null;
}

function detectWeb(doc, url) {
  safeLog("ERESERVE-CUSTOM: detectWeb", url);
  if (!isEreserveUrl(url, doc)) {
    return false;
  }
  if (
    (doc && doc.querySelector && doc.querySelector(".reading_list_item")) ||
    getListId(url, doc)
  ) {
    return "multiple";
  }
  return false;
}

function citationToAssignmentId(id) {
  var value = String(id || "");
  if (!value) {
    return null;
  }
  if (value.indexOf("assignment-") === 0) {
    return value;
  }
  return "assignment-" + value;
}

function originFromUrl(url) {
  try {
    return new URL(url).origin;
  } catch (e) {
    return "";
  }
}

function mapItemType(kind) {
  var type = String(kind || "").toLowerCase().replace(/_/g, "-");
  var map = {
    book: "book",
    chapter: "bookSection",
    "book-chapter": "bookSection",
    journal: "journalArticle",
    article: "journalArticle",
    "journal-article": "journalArticle",
    "article-journal": "journalArticle",
    webpage: "webpage",
    website: "webpage",
    link: "webpage",
    video: "videoRecording",
    audio: "audioRecording",
    thesis: "thesis",
    report: "report",
    file: "document",
    document: "document",
  };
  return map[type] || "journalArticle";
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

function queryAll(doc, selector) {
  if (!doc || !doc.querySelectorAll) {
    return [];
  }
  return Array.prototype.slice.call(doc.querySelectorAll(selector));
}

function groupTitle(groupEl) {
  var heading =
    groupEl.querySelector &&
    (groupEl.querySelector(".group-header") ||
      groupEl.querySelector(".accordion-heading") ||
      groupEl.querySelector("h2, h3, h4, .group-name, .reading_list_group_name"));
  return textContent(heading) || textContent(groupEl).split("\n")[0] || "Readings";
}

function scrapeListFromDom(doc, pageUrl) {
  var listEl =
    (doc.getElementById && doc.getElementById("selected_reading_list")) ||
    (doc.querySelector && doc.querySelector(".reading-list, #grouped_readings"));
  var listId =
    dataset(listEl, "listId") ||
    attr(listEl, "data-list-id") ||
    getListId(pageUrl, doc);
  var offeringId =
    dataset(listEl, "offeringId") || attr(listEl, "data-offering-id");
  var itemShowUrl =
    dataset(listEl, "itemShowUrl") || attr(listEl, "data-item-show-url");
  var readingUrlPath = "";
  var readingUrlEl =
    doc.querySelector && doc.querySelector("[data-get-reading-url-path]");
  if (readingUrlEl) {
    readingUrlPath = attr(readingUrlEl, "data-get-reading-url-path");
  }
  var titleEl = doc.getElementById && doc.getElementById("reading_list_name");
  var codeEl = doc.getElementById && doc.getElementById("unit_code");
  var collectionTitle =
    (titleEl && titleEl.value) ||
    textContent(titleEl) ||
    (doc.title || "").replace(/\s*[|–-]\s*eReserve.*$/i, "").trim();
  var courseCode = (codeEl && codeEl.value) || textContent(codeEl);

  var groups = queryAll(doc, ".reading_list_group");
  if (!groups.length) {
    groups = listEl ? [listEl] : [doc.body];
  }
  var sections = [];
  var itemsById = {};
  for (var i = 0; i < groups.length; i++) {
    var group = groups[i];
    var itemEls = queryAll(group, ".reading_list_item");
    if (!itemEls.length && group.classList && group.classList.contains("reading_list_item")) {
      itemEls = [group];
    }
    var citations = [];
    for (var j = 0; j < itemEls.length; j++) {
      var el = itemEls[j];
      var id =
        dataset(el, "id") ||
        attr(el, "data-id") ||
        String(el.id || "").replace(/^[^\d]+/, "");
      if (!id) {
        continue;
      }
      var importance =
        dataset(el, "readingImportance") ||
        attr(el, "data-reading-importance") ||
        "";
      var kind =
        dataset(el, "readingDocumentKind") ||
        attr(el, "data-reading-document-kind") ||
        "";
      var title =
        dataset(el, "readingTitle") ||
        attr(el, "data-reading-title") ||
        "";
      var authors =
        dataset(el, "readingAuthors") ||
        attr(el, "data-reading-authors") ||
        "";
      var citeEl =
        (doc.getElementById && doc.getElementById("item_citation_" + id)) ||
        (el.querySelector && el.querySelector(".csl-entry, .citation"));
      citations.push({
        id: String(id),
        title: title || textContent(citeEl) || "Untitled",
        authors: authors,
        importance: importance,
        kind: kind,
        citationHtml: citeEl ? citeEl.innerHTML : "",
        citationText: textContent(citeEl),
      });
      itemsById[String(id)] = citations[citations.length - 1];
    }
    if (!citations.length && groups.length > 1) {
      continue;
    }
    var genericContainer =
      group === doc.body ||
      (group.id && group.id === "selected_reading_list");
    sections.push({
      title: genericContainer ? "Readings" : groupTitle(group),
      citations: citations,
    });
  }
  if (!sections.length && Object.keys(itemsById).length) {
    sections.push({
      title: "Readings",
      citations: Object.keys(itemsById).map(function (id) {
        return itemsById[id];
      }),
    });
  }
  return {
    id: listId,
    offeringId: offeringId,
    collectionTitle: collectionTitle,
    courseCode: courseCode,
    itemShowUrl: itemShowUrl,
    readingUrlPath: readingUrlPath,
    sections: sections,
    itemsById: itemsById,
  };
}

function collectSearchResults(list) {
  var items = {};
  var sections = list.sections || [];
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
      var name =
        importance === "core_reading"
          ? "Core reading"
          : importance.charAt(0).toUpperCase() + importance.slice(1);
      out.push({
        id: String(importance),
        name: name,
        color: PRIORITY_COLORS[importance] || PRIORITY_COLORS[name] || "#AAA",
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
  var priorities = buildPriorities(list);
  if (priorities.length) {
    metadata.priorities = priorities;
  }
  var classNumber = 1;
  var sections = list.sections || [];
  for (var i = 0; i < sections.length; i++) {
    var citations = sections[i].citations || [];
    var itemOrder = citations.map(function (citation) {
      return citationToAssignmentId(citation.id);
    });
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

function replaceItemPlaceholder(url, itemId) {
  if (!url) {
    return "";
  }
  return String(url).replace(/items\/0\b/, "items/" + itemId);
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

async function fetchItemDetails(pageUrl, list, citationId) {
  var path = replaceItemPlaceholder(list.itemShowUrl, citationId);
  if (!path) {
    return null;
  }
  try {
    var abs = path.indexOf("http") === 0 ? path : originFromUrl(pageUrl) + path;
    return await requestJson(abs);
  } catch (error) {
    safeLog("ERESERVE-CUSTOM: item details failed", citationId, error);
    return null;
  }
}

async function fetchReadingFileUrl(pageUrl, list, citationId) {
  var path = replaceItemPlaceholder(list.readingUrlPath, citationId);
  if (!path) {
    return "";
  }
  try {
    var abs = path.indexOf("http") === 0 ? path : originFromUrl(pageUrl) + path;
    var data = await requestJson(abs);
    return (data && (data.url || data.file_url || data.href)) || "";
  } catch (error) {
    safeLog("ERESERVE-CUSTOM: reading URL failed", citationId, error);
    return "";
  }
}

function populateFromCsl(item, csl, fallback) {
  if (csl && typeof ZU.itemFromCSLJSON === "function") {
    try {
      ZU.itemFromCSLJSON(item, csl);
    } catch (e) {
      safeLog("ERESERVE-CUSTOM: itemFromCSLJSON failed", e);
    }
  }
  if (!item.title && fallback && fallback.title) {
    item.title = fallback.title;
  }
  if ((!item.creators || !item.creators.length) && fallback && fallback.authors) {
    var names = String(fallback.authors).split(/\s*;\s*|\s*\|\s*/);
    for (var i = 0; i < names.length; i++) {
      addCreator(item, names[i]);
    }
  }
  item.libraryCatalog = "eReserve Plus";
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
  var n = Math.min(bytes.length, 64);
  for (var i = 0; i < n; i++) {
    start += String.fromCharCode(bytes[i]);
  }
  start = start.replace(/^\uFEFF/, "").trim().toLowerCase();
  return start.indexOf("<!") === 0 || start.indexOf("<html") === 0;
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

function extractRedirectUrls(html, baseUrl) {
  var urls = [];
  var add = function (raw) {
    if (!raw) {
      return;
    }
    try {
      var abs = new URL(String(raw).replace(/&amp;/g, "&"), baseUrl).href;
      if (isHttpUrl(abs) && urls.indexOf(abs) === -1) {
        urls.push(abs);
      }
    } catch (e) {
      // Ignore.
    }
  };
  var meta = html.match(/url\s*=\s*([^"'>\s]+)/i);
  if (meta) {
    add(meta[1]);
  }
  var locRe = /(?:window\.)?location(?:\.href|\.replace)?\s*=\s*["']([^"']+)["']/gi;
  var match;
  while ((match = locRe.exec(html))) {
    add(match[1]);
  }
  var iframeRe = /<(?:iframe|embed|object)[^>]+(?:src|data)\s*=\s*["']([^"']+)["']/gi;
  while ((match = iframeRe.exec(html))) {
    add(match[1]);
  }
  return urls;
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
  if (!isHttpUrl(url) || hop > 6 || seen[url]) {
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
    if (looksLikeHtmlBytes(bytes) || /text\/html|application\/xhtml/.test(contentType)) {
      var next = extractRedirectUrls(bytesToUtf8(bytes), url);
      for (var i = 0; i < next.length; i++) {
        var file = await tryDownloadFile(next[i], hop + 1, seen);
        if (file) {
          return file;
        }
      }
    }
    return null;
  } catch (error) {
    safeLog("ERESERVE-CUSTOM: download failed", url, error);
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
    safeLog("ERESERVE-CUSTOM: stash POST failed", error);
    return false;
  }
}

async function setSyllabusMetadata(metadata) {
  return await postToZoteroLocal("/syllabus/setTalisMetadata", {
    metadata: metadata,
  });
}

function collectCandidateUrls(details, fileUrl, doc, citation) {
  var urls = [];
  var push = function (value) {
    if (isHttpUrl(value) && urls.indexOf(value) === -1) {
      urls.push(value);
    }
  };
  push(fileUrl);
  if (details) {
    push(details.url);
    push(details.file_url);
    push(details.fileUrl);
    push(details.download_url);
    if (details.csl_data && details.csl_data.URL) {
      push(details.csl_data.URL);
    }
  }
  if (doc && doc.querySelectorAll && citation && citation.id) {
    var anchors = doc.querySelectorAll(
      '.reading_list_item[data-id="' + citation.id + '"] a[href]',
    );
    for (var i = 0; i < anchors.length; i++) {
      push(anchors[i].href);
    }
  }
  urls.sort(function (left, right) {
    var rank = function (url) {
      if (isClaOrDigitizedUrl(url) || looksLikeFileUrl(url)) {
        return 0;
      }
      if (/\/(file|files|download|pdf)\b/i.test(url)) {
        return 1;
      }
      return 2;
    };
    return rank(left) - rank(right);
  });
  return urls.slice(0, 10);
}

async function attachFiles(item, citationId, urls) {
  var stored = 0;
  for (var i = 0; i < urls.length && stored < 3; i++) {
    var file = await tryDownloadFile(urls[i]);
    if (!file) {
      continue;
    }
    var title =
      file.contentType.indexOf("epub") !== -1
        ? "Full Text EPUB"
        : "Full Text PDF";
    var stashed = await stashReadingListFile({
      citationId: String(citationId),
      title: title,
      contentType: file.contentType,
      filename: file.filename,
      data: bytesToBase64(file.bytes),
    });
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

async function scrape(pageUrl, doc, selectedIds, list) {
  safeLog("ERESERVE-CUSTOM: scraping", selectedIds.length, "items");
  var metadata = constructExportSyllabusMetadata(pageUrl, list);
  var syllabusResponseString;
  try {
    syllabusResponseString = await setSyllabusMetadata(metadata);
  } catch (error) {
    safeLog("ERESERVE-CUSTOM: syllabus metadata POST failed", error);
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
  var fileUrlById = {};
  await Promise.all(
    selectedIds.map(async function (id) {
      detailsById[id] = await fetchItemDetails(pageUrl, list, id);
      fileUrlById[id] = await fetchReadingFileUrl(pageUrl, list, id);
    }),
  );

  for (var i = 0; i < selectedIds.length; i++) {
    var citationId = selectedIds[i];
    var citation = list.itemsById[citationId];
    if (!citation) {
      continue;
    }
    var details = detailsById[citationId] || {};
    var csl = details.csl_data || details.csl || details;
    var itemType = mapItemType(
      (csl && csl.type) || citation.kind || "journalArticle",
    );
    var item = new Zotero.Item(itemType);
    populateFromCsl(item, csl && csl.title ? csl : null, citation);
    if (!item.url && fileUrlById[citationId]) {
      item.url = fileUrlById[citationId];
    }
    await attachFiles(
      item,
      citationId,
      collectCandidateUrls(details, fileUrlById[citationId], doc, citation),
    );
    if (collectionKey) {
      var assignment = { id: citationToAssignmentId(citationId) };
      var classNumber = findClassNumber(list, citationId);
      if (classNumber) {
        assignment.classNumber = classNumber;
      }
      if (citation.importance) {
        assignment.priority = citation.importance;
      }
      var itemSyllabusData = {};
      itemSyllabusData[collectionKey] = [assignment];
      item.extra = "syllabus: " + JSON.stringify(itemSyllabusData);
    }
    item.complete();
  }
}

async function doWeb(doc, url) {
  safeLog("ERESERVE-CUSTOM: doWeb", url);
  var list = scrapeListFromDom(doc, url);
  var items = collectSearchResults(list);
  if (!Object.keys(items).length) {
    throw new Error(
      "ERESERVE-CUSTOM: No readings found. Open the reading list (after sign-in if needed) and try again.",
    );
  }
  var requestedItems = await Zotero.selectItems(items);
  if (requestedItems && Object.keys(requestedItems).length > 0) {
    await scrape(url, doc, Object.keys(requestedItems), list);
  }
}

/** BEGIN TEST CASES **/
var testCases = [
  {
    type: "web",
    url: "https://ereserve.ecu.edu.au/app/public_lists#/unit/4955/list/15619",
    defer: true,
    items: "multiple",
  },
];
/** END TEST CASES **/
