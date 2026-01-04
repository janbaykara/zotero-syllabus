/*
  ***** BEGIN LICENSE BLOCK *****
	
  Copyright © 2013-2021 Sebastian Karcher and Abe Jellinek
  This file is part of Zotero.
	
  Zotero is free software: you can redistribute it and/or modify
  it under the terms of the GNU Affero General Public License as published by
  the Free Software Foundation, either version 3 of the License, or
  (at your option) any later version.
	
  Zotero is distributed in the hope that it will be useful,
  but WITHOUT ANY WARRANTY; without even the implied warranty of
  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
  GNU Affero General Public License for more details.
	
  You should have received a copy of the GNU Affero General Public License
  along with Zotero.  If not, see <http://www.gnu.org/licenses/>.
	
  ***** END LICENSE BLOCK *****
*/

function detectWeb(doc, url) {
  if (url.includes("/lists/") && getSearchResults(doc, true)) return "multiple";

  if (url.includes("/items/")) {
    var type = ZU.xpathText(doc, '//dd/span[@class="label"]');
    if (!type) type = text(doc, "rl-bibliographic-resource-type");
    if (type == "Book") return "book";
    if (type == "Webpage" || type == "Website") return "webpage";
    return "journalArticle";
  }

  return false;
}

function getSearchResults(doc, checkOnly) {
  var items = {},
    found = false;
  var bibData = doc.querySelectorAll("article[id]");
  for (let article of bibData) {
    let title = text(article, "cite");
    let slug = "items/" + article.id.split("_")[1];
    if (!title || !slug) continue;
    if (checkOnly) return true;
    found = true;
    items[slug] = ZU.trimInternal(title);
  }

  return found ? items : false;
}

function doWeb(doc, url) {
  ztoolkit.log("doWeb", doc, url);
  if (detectWeb(doc, url) == "multiple") {
    Zotero.selectItems(getSearchResults(doc), function (items) {
      if (!items) return;
      scrape(url, Object.keys(items));
    });
  } else {
    scrape(url, [extractSlug(url)]);
  }
}

function scrape(url, slugs) {
  let siteID = url.match(/\/\d+\/([^/]+)/);
  if (!siteID) siteID = url.match(/([^.]+)\.rl\.talis\.com/);
  siteID = siteID[1];
  let urls = slugs.map((slug) => `https://${siteID}.rl.talis.com/${slug}.ris`);

  ZU.doGet(urls, function (text) {
    var translator = Zotero.loadTranslator("import");
    // RIS
    translator.setTranslator("32d59d2d-b65a-4da4-b0a3-bdd3cfb979e7");
    translator.setString(text);
    translator.translate();
  });
}

function extractSlug(url) {
  return (url.match(/([^/]+\/[^/]+)\.html/) || [])[1];
}

/** BEGIN TEST CASES **/
var testCases = [];
/** END TEST CASES **/
