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
  Core: "#8B5CF6",
  Mandatory: "#8B5CF6",
  Required: "#8B5CF6",
  Recommended: "#3B82F6",
  Additional: "#3B82F6",
  Suggested: "#3B82F6",
  Further: "#95A5A6",
  Optional: "#95A5A6",
  Digitisation: "#F97316",
};

function isKeyLinksUrl(url) {
  var text = String(url || "");
  if (/\/api2\//i.test(text)) {
    return false;
  }
  return /\.keylinks\.org(?:[:/]|$)/i.test(text);
}

function getListId(url) {
  var text = String(url || "");
  var match =
    text.match(/\/(?:hierarchy\/)?lists?\/(\d+)/i) ||
    text.match(/[?#&]lists?Id=(\d+)/i);
  return match ? match[1] : null;
}

function getMaterialId(url) {
  var text = String(url || "");
  var match =
    text.match(/\/materials?\/(\d+)/i) ||
    text.match(/[?#&]materials?Id=(\d+)/i);
  return match ? match[1] : null;
}

function detectWeb(doc, url) {
  safeLog("KEYLINKS-CUSTOM: detectWeb", url);
  if (!isKeyLinksUrl(url)) {
    return false;
  }
  if (getListId(url)) {
    return "multiple";
  }
  if (getMaterialId(url)) {
    return "journalArticle";
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

function apiUrl(pageUrl, path) {
  return originFromUrl(pageUrl) + path;
}

async function requestJson(url) {
  var response = await ZU.request(url, {
    headers: { Accept: "application/json, text/plain, */*" },
  });
  var body = response && response.body;
  if (typeof body === "string") {
    return JSON.parse(body);
  }
  return body;
}

function isNoteMaterial(material) {
  var type = String(
    (material && material.type) ||
      (material && material.metadata && material.metadata.type) ||
      "",
  ).toLowerCase();
  var typeId = material && material.type_id;
  return type === "note" || typeId === 23;
}

function materialTitle(material) {
  return (
    (material && material.title) ||
    (material && material.metadata && material.metadata.title) ||
    "Untitled"
  );
}

function visibleMaterials(section) {
  var materials = (section && section.materials) || [];
  return materials.filter(function (material) {
    return material && material.id && !isNoteMaterial(material);
  });
}

async function fetchListJson(pageUrl) {
  var listId = getListId(pageUrl);
  if (!listId) {
    throw new Error("KEYLINKS-CUSTOM: No list id in URL " + pageUrl);
  }
  var data = await requestJson(apiUrl(pageUrl, "/api2/lists/" + listId));
  if (!data || !data.id) {
    throw new Error("KEYLINKS-CUSTOM: List API returned no list");
  }
  return data;
}

async function fetchConfigs(pageUrl) {
  try {
    return await requestJson(apiUrl(pageUrl, "/api2/configs"));
  } catch (error) {
    safeLog("KEYLINKS-CUSTOM: configs failed", error);
    return {};
  }
}

async function fetchDigitisations(pageUrl, listId) {
  try {
    var data = await requestJson(
      apiUrl(pageUrl, "/api2/digitisations?ListId=" + listId),
    );
    return Array.isArray(data) ? data : [];
  } catch (error) {
    safeLog("KEYLINKS-CUSTOM: digitisations failed", error);
    return [];
  }
}

function institutionFromConfigs(configs, list) {
  if (list && list.source && list.source.code) {
    return String(list.source.code);
  }
  if (configs && configs.code) {
    return String(configs.code);
  }
  return undefined;
}

function isoDate(value) {
  if (!value) {
    return null;
  }
  var match = String(value).match(/^(\d{4}-\d{2}-\d{2})/);
  return match ? match[1] : null;
}

function buildPriorities(list) {
  var seen = {};
  var out = [];
  var source = (list && list.priorities) || [];
  for (var i = 0; i < source.length; i++) {
    var row = source[i];
    var name = (row && (row.name || row.title)) || "";
    var id = row && (row.id || row.name);
    if (id == null || id === 0 || !name) {
      continue;
    }
    if (/^(unassigned|none selected|pending|rejected)$/i.test(name)) {
      continue;
    }
    var key = String(id);
    if (seen[key]) {
      continue;
    }
    seen[key] = true;
    out.push({
      id: key,
      name: String(name),
      color: PRIORITY_COLORS[name] || "#AAA",
      order: out.length + 1,
    });
  }
  return out;
}

function constructExportSyllabusMetadata(pageUrl, list, configs) {
  var metadata = {
    collectionTitle: list.name || undefined,
    description: list.public_note || list.summary || undefined,
    classes: {},
    links: pageUrl ? [pageUrl] : [],
  };
  if (list.course_identifier) {
    metadata.courseCode = String(list.course_identifier).trim();
  }
  var institution = institutionFromConfigs(configs, list);
  if (institution) {
    metadata.institution = institution;
  }
  var priorities = buildPriorities(list);
  if (priorities.length) {
    metadata.priorities = priorities;
  }
  var sections = (list.sections || []).slice().sort(function (a, b) {
    return (a.rank || 0) - (b.rank || 0);
  });
  var classNumber = 1;
  for (var i = 0; i < sections.length; i++) {
    var section = sections[i];
    var materials = visibleMaterials(section);
    var itemOrder = materials.map(function (material) {
      return citationToAssignmentId(material.id);
    });
    if (!section.title && !itemOrder.length) {
      continue;
    }
    var classObj = {};
    if (section.title) {
      classObj.title = section.title;
    }
    if (section.note) {
      classObj.description = String(section.note).replace(/<[^>]+>/g, "").trim();
    }
    if (itemOrder.length) {
      classObj.itemOrder = itemOrder;
    }
    var readingDate = isoDate(section.start) || isoDate(section.start_date);
    if (readingDate) {
      classObj.readingDate = readingDate;
    }
    metadata.classes[String(classNumber)] = classObj;
    classNumber += 1;
  }
  return metadata;
}

function getSearchResultsFromList(list) {
  var items = {};
  var sections = (list.sections || []).slice().sort(function (a, b) {
    return (a.rank || 0) - (b.rank || 0);
  });
  for (var i = 0; i < sections.length; i++) {
    var section = sections[i];
    var materials = visibleMaterials(section);
    for (var j = 0; j < materials.length; j++) {
      var material = materials[j];
      var title = String(materialTitle(material)).trim();
      if (section.title) {
        title = section.title + ": " + title;
      }
      items[String(material.id)] = title;
    }
  }
  return items;
}

function findMaterial(list, materialId) {
  var sections = list.sections || [];
  for (var i = 0; i < sections.length; i++) {
    var materials = sections[i].materials || [];
    for (var j = 0; j < materials.length; j++) {
      if (String(materials[j].id) === String(materialId)) {
        return materials[j];
      }
    }
  }
  return null;
}

function findClassNumber(list, materialId) {
  var sections = (list.sections || []).slice().sort(function (a, b) {
    return (a.rank || 0) - (b.rank || 0);
  });
  var classNumber = 1;
  for (var i = 0; i < sections.length; i++) {
    var materials = visibleMaterials(sections[i]);
    if (!sections[i].title && !materials.length) {
      continue;
    }
    for (var j = 0; j < materials.length; j++) {
      if (String(materials[j].id) === String(materialId)) {
        return classNumber;
      }
    }
    classNumber += 1;
  }
  return undefined;
}

function mapItemType(material) {
  var type = String(
    (material && material.type) ||
      (material && material.metadata && material.metadata.type) ||
      "",
  )
    .toLowerCase()
    .replace(/_/g, "-");
  var map = {
    book: "book",
    chapter: "bookSection",
    article: "journalArticle",
    "article-journal": "journalArticle",
    webpage: "webpage",
    website: "webpage",
    thesis: "thesis",
    "motion-picture": "videoRecording",
    motion_picture: "videoRecording",
    pamphlet: "document",
    "audio-recording": "audioRecording",
    report: "report",
    "conference-paper": "conferencePaper",
  };
  return map[type] || "journalArticle";
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
    item.creators.push({
      lastName: cleaned,
      creatorType: creatorType || "author",
      fieldMode: 1,
    });
  }
}

function authorsFromMaterial(material) {
  var names = [];
  if (Array.isArray(material.authors) && material.authors.length) {
    return material.authors;
  }
  var meta = material.metadata || {};
  var blobs = meta.author || [];
  for (var i = 0; i < blobs.length; i++) {
    if (typeof blobs[i] === "string") {
      names.push(blobs[i]);
    } else if (blobs[i] && blobs[i].literal) {
      names.push(blobs[i].literal);
    } else if (blobs[i] && (blobs[i].family || blobs[i].given)) {
      names.push(
        [blobs[i].family, blobs[i].given].filter(Boolean).join(", "),
      );
    }
  }
  return names;
}

function firstOf(value) {
  if (Array.isArray(value) && value.length) {
    return value[0];
  }
  return value || "";
}

function populateItem(item, material, pageUrl) {
  var meta = material.metadata || {};
  item.title = materialTitle(material);
  var authors = authorsFromMaterial(material);
  for (var i = 0; i < authors.length; i++) {
    addCreator(item, authors[i], "author");
  }
  var year =
    material.issuedYear ||
    meta["year-suffix"] ||
    (meta.issued && (meta.issued["date-parts"] || meta.issued.raw)) ||
    meta.issued;
  if (year) {
    if (Array.isArray(year)) {
      year = year[0];
    }
    item.date = String(year).replace(/T.*$/, "").replace(/-01-01.*$/, "");
  }
  if (material.publisher || meta.publisher) {
    item.publisher = material.publisher || meta.publisher;
  }
  var place = meta["publisher-place"] || meta["original-publisher-place"];
  if (place) {
    item.place = place;
  }
  if (material.edition || meta.edition) {
    item.edition = material.edition || meta.edition;
  }
  var isbn = firstOf(material.isbnList || meta.ISBN);
  if (isbn) {
    item.ISBN = isbn;
  }
  var issn = firstOf(material.issnList || meta.ISSN);
  if (issn) {
    item.ISSN = issn;
  }
  var doi = material.doi || meta.DOI || meta.doi;
  if (doi) {
    item.DOI = String(doi).replace(/^https?:\/\/doi\.org\//i, "");
  }
  var container = material.containerTitle || meta["container-title"];
  if (container && item.itemType === "journalArticle") {
    item.publicationTitle = container;
  }
  if (container && item.itemType === "bookSection") {
    item.bookTitle = container;
  }
  if (material.chapterNumber || meta["chapter-number"]) {
    var chapter = material.chapterNumber || meta["chapter-number"];
    if (!item.title) {
      item.title = "Chapter " + chapter;
    }
  }
  var pages = meta["number-of-pages"];
  if (pages && /[-–]/.test(String(pages))) {
    item.pages = String(pages);
  }
  var url =
    material.fullTextLink ||
    material.fulltext_link ||
    material.webLink ||
    material.web_link ||
    material.licencedContentLink ||
    material.licenced_content_link;
  if (url && /^https?:\/\//i.test(url)) {
    item.url = url;
  } else if (pageUrl) {
    item.url = pageUrl.split("#")[0].replace(/[?#].*$/, "");
  }
  item.libraryCatalog = "KeyLinks";
}

function priorityIdForMaterial(material) {
  var priority = material && material.priority;
  if (priority && typeof priority === "object") {
    return priority.id != null ? String(priority.id) : undefined;
  }
  if (priority != null && priority !== 0) {
    return String(priority);
  }
  return undefined;
}

function classInstructionForMaterial(material) {
  var note =
    material.studentNote ||
    material.note ||
    (material.metadata && material.metadata.note);
  if (!note) {
    return undefined;
  }
  return String(note)
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function isHttpUrl(value) {
  return typeof value === "string" && /^https?:\/\//i.test(value.trim());
}

function looksLikeFileUrl(url) {
  return /\.(pdf|epub|docx?|pptx?|txt)(\?|#|$)/i.test(url);
}

function isClaOrDigitizedUrl(url) {
  return /contentstore\.cla\.co\.uk|\/link-shib\b|digitool|\/dcs\b|licenced.?content/i.test(
    url,
  );
}

function isSkippableDownloadUrl(url) {
  if (!isHttpUrl(url)) {
    return true;
  }
  if (/\.(png|jpe?g|gif|svg|webp|ico|css|js)(\?|#|$)/i.test(url)) {
    return true;
  }
  if (/google-analytics|doubleclick|facebook\.com|twitter\.com/i.test(url)) {
    return true;
  }
  if (/primo\.exlibrisgroup\.com|\/discovery\/(search|fulldisplay|openurl)/i.test(url)) {
    return true;
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
  if (/doi\.org\//i.test(url)) {
    return 3;
  }
  if (/ezproxy|openurl|uresolver/i.test(url)) {
    return 4;
  }
  return 2;
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
        /url|link|file|source|pdf|download|href|dcs|uri|full.?text|licenced|web.?link/i.test(
          key,
        )
      ) {
        collectUrlStrings(value[key], into, depth + 1);
      }
    }
  }
}

function materialCandidateUrls(material, digitisations) {
  var urls = [];
  collectUrlStrings(material, urls, 0);
  var materialId = String((material && material.id) || "");
  for (var i = 0; i < (digitisations || []).length; i++) {
    if (String(digitisations[i].materialId) === materialId) {
      collectUrlStrings(digitisations[i], urls, 0);
    }
  }
  var seen = {};
  var unique = [];
  for (var j = 0; j < urls.length; j++) {
    var url = urls[j];
    if (seen[url] || isSkippableDownloadUrl(url)) {
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

function unescapeHtmlAttr(value) {
  return String(value || "")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
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
  if (metaRefresh) {
    addCandidateUrl(urls, metaRefresh[1], baseUrl);
  }
  var locRe =
    /(?:window\.)?location(?:\.href|\.replace)?\s*=\s*["']([^"']+)["']/gi;
  var locMatch;
  while ((locMatch = locRe.exec(html))) {
    addCandidateUrl(urls, locMatch[1], baseUrl);
  }
  var iframeRe =
    /<(?:iframe|embed|object|source)[^>]+(?:src|data)\s*=\s*["']([^"']+)["']/gi;
  while ((locMatch = iframeRe.exec(html))) {
    addCandidateUrl(urls, locMatch[1], baseUrl);
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
    for (var i = 0; i < nextUrls.length; i++) {
      var file = await tryDownloadFile(nextUrls[i], hop + 1, seen);
      if (file) {
        return file;
      }
    }
    return null;
  } catch (error) {
    safeLog("KEYLINKS-CUSTOM: download failed", url, error);
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
    safeLog("KEYLINKS-CUSTOM: stash POST failed", error);
    return false;
  }
}

async function setSyllabusMetadata(metadata) {
  return await postToZoteroLocal("/syllabus/setTalisMetadata", {
    metadata: metadata,
  });
}

async function attachMaterialFiles(item, material, digitisations) {
  var citationId = String((material && material.id) || "");
  var urls = materialCandidateUrls(material, digitisations);
  var stored = 0;
  for (var i = 0; i < urls.length && stored < 3; i++) {
    var file = await tryDownloadFile(urls[i]);
    if (!file) {
      continue;
    }
    var title = isClaOrDigitizedUrl(urls[i])
      ? "CLA / digitized PDF"
      : file.contentType.indexOf("epub") !== -1
        ? "Full Text EPUB"
        : "Full Text PDF";
    var stashed = citationId
      ? await stashReadingListFile({
          citationId: citationId,
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

async function scrape(pageUrl, selectedIds, list, configs, digitisations) {
  safeLog("KEYLINKS-CUSTOM: scraping", selectedIds.length, "items");
  var metadata = constructExportSyllabusMetadata(pageUrl, list, configs);
  var syllabusResponseString;
  try {
    syllabusResponseString = await setSyllabusMetadata(metadata);
  } catch (error) {
    safeLog("KEYLINKS-CUSTOM: syllabus metadata POST failed", error);
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
    var materialId = selectedIds[i];
    var material = findMaterial(list, materialId);
    if (!material || isNoteMaterial(material)) {
      continue;
    }
    var item = new Zotero.Item(mapItemType(material));
    populateItem(item, material, pageUrl);
    await attachMaterialFiles(item, material, digitisations);
    if (collectionKey) {
      var assignment = {
        id: citationToAssignmentId(materialId),
      };
      var classNumber = findClassNumber(list, materialId);
      if (classNumber) {
        assignment.classNumber = classNumber;
      }
      var priority = priorityIdForMaterial(material);
      if (priority) {
        assignment.priority = priority;
      }
      var instruction = classInstructionForMaterial(material);
      if (instruction) {
        assignment.classInstruction = instruction;
      }
      var itemSyllabusData = {};
      itemSyllabusData[collectionKey] = [assignment];
      item.extra = "syllabus: " + JSON.stringify(itemSyllabusData);
    }
    item.complete();
  }
}

async function doWeb(doc, url) {
  safeLog("KEYLINKS-CUSTOM: doWeb", url);
  var list = await fetchListJson(url);
  var configs = await fetchConfigs(url);
  var digitisations = await fetchDigitisations(url, list.id);
  var detected = detectWeb(doc, url);
  if (detected === "multiple") {
    var items = getSearchResultsFromList(list);
    var requestedItems = await Zotero.selectItems(items);
    if (requestedItems && Object.keys(requestedItems).length > 0) {
      await scrape(
        url,
        Object.keys(requestedItems),
        list,
        configs,
        digitisations,
      );
    }
  } else {
    var materialId = getMaterialId(url);
    var selected = materialId
      ? [materialId]
      : Object.keys(getSearchResultsFromList(list));
    await scrape(url, selected, list, configs, digitisations);
  }
}

/** BEGIN TEST CASES **/
var testCases = [
  {
    type: "web",
    url: "https://mdx.keylinks.org/new-ui/hierarchy/list/8875",
    defer: true,
    items: "multiple",
  },
];
/** END TEST CASES **/
