// @ts-nocheck
/* eslint-disable */

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

// Safe logging helper - ztoolkit is only available in plugin context, not in translator sandbox
function safeLog(...args) {
  if (typeof ztoolkit !== "undefined") {
    ztoolkit.log(...args);
  } else if (typeof Zotero !== "undefined" && Zotero.debug) {
    Zotero.debug(args.map(a => typeof a === 'object' ? JSON.stringify(a) : a).join(' '));
  } else if (typeof console !== "undefined") {
    console.log(...args);
  }
}

// ============================================================================
// ORIGINAL TRANSLATOR FUNCTIONS
// ============================================================================

function detectWeb(doc, url) {
  safeLog("TALIS-ASPIRE-CUSTOM: detectWeb", doc, url);

  // Yes
  const hostRegexes = [
    "lists.library.lincoln.ac.uk",
    "aspire.surrey.ac.uk",
    "myreading.surrey.ac.uk",
    "resource.surrey.ac.uk",
    "lib.surrey.ac.uk",
    "cypruslists.surrey.ac.uk",
    "lists.surrey.ac.uk",
    "items.surrey.ac.uk",
    "rl.talis.com",
  ]
  if (!hostRegexes.some(regex => url.includes(regex))) {
    return false;
  }

  if (url.includes("/lists/")) {
    return "multiple";
  }
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

/**
 * Return a dictionary of item UUIDs and titles from the search results.
 * If checkOnly is true, only return the dictionary if it is not empty.
 * If checkOnly is false, return the dictionary and the syllabus data.
 * @param {Document} doc - The document to search.
 * @returns {Record<string, string>} - The dictionary of item UUIDs and titles, or false if the search results are empty.
 */
function getSearchResults(doc, url, callback) {
  // call the item API
  var method = "GET";
  var apiUrl = getTalisItemAPIUrl(url);
  var headers = getAuthenticationHeaders(doc, url);
  ZU.doGet(apiUrl, cb, undefined, undefined, headers)

  function cb(text) {
    safeLog("TALIS-ASPIRE-CUSTOM: getSearchResults response", text);

    var items = {};
    try {
      var json = JSON.parse(text);

      // Build a lookup of resource ID -> title from the included array
      // Resources are included via the "resource" include parameter
      var resourceTitles = {};
      if (json.included) {
        for (var i = 0; i < json.included.length; i++) {
          var inc = json.included[i];
          if (inc.type === "resources" && inc.attributes && inc.attributes.title) {
            resourceTitles[inc.id] = inc.attributes.title;
          }
        }
      }

      // Map each item UUID to its resource title
      if (json.data) {
        for (var i = 0; i < json.data.length; i++) {
          var item = json.data[i];
          var itemId = item.id;

          // Get the resource ID from the relationship
          var resourceId = item.relationships &&
            item.relationships.resource &&
            item.relationships.resource.data &&
            item.relationships.resource.data.id;

          if (resourceId && resourceTitles[resourceId]) {
            items[itemId] = resourceTitles[resourceId];
          } else {
            // Fallback: use a placeholder if no resource title found
            safeLog("TALIS-ASPIRE-CUSTOM: No title found for item", itemId);
          }
        }
      }

      safeLog("TALIS-ASPIRE-CUSTOM: getSearchResults found", Object.keys(items).length, "items");
    } catch (e) {
      safeLog("TALIS-ASPIRE-CUSTOM: Error parsing items JSON", e);
    }
    callback(items);
  }
}

function doWeb(doc, url) {
  safeLog("TALIS-ASPIRE-CUSTOM: doWeb", doc, url);
  if (detectWeb(doc, url) == "multiple") {
    getSearchResults(doc, url, function (items) {
      Zotero.selectItems(items, function (items) {
        if (!items) return;
        scrape(url, Object.keys(items));
      });
    });
  } else {
    scrape(url, [extractSlug(url)]);
  }
}

function scrape(url, slugs) {
  safeLog("TALIS-ASPIRE-CUSTOM: scrape", url, slugs);
  let siteID = url.match(/\/\d+\/([^/]+)/);
  if (!siteID) siteID = url.match(/([^.]+)\.rl\.talis\.com/);
  siteID = siteID[1];
  let urls = slugs.map((slug) => `https://${siteID}.rl.talis.com/items/${slug}.ris`);
  safeLog("TALIS-ASPIRE-CUSTOM: Scrape URLs:", urls);

  ZU.doGet(urls, function (text) {
    var translator = Zotero.loadTranslator("import");
    // RIS
    translator.setTranslator("32d59d2d-b65a-4da4-b0a3-bdd3cfb979e7");
    translator.setString(text);
    translator.translate();
  });

  // TODO: Export class data too
  generateClassData(url);
}

function generateClassData(classes) {
  safeLog("TALIS-ASPIRE-CUSTOM: TODO: Generate class data", classes);
  // TODO: Get the class data from the API — only top level classes
  // TODO: For each class, get ALLLLLL items in the tree
}

function extractSlug(url) {
  safeLog("TALIS-ASPIRE-CUSTOM: extractSlug", url);
  return (url.match(/([^/]+\/[^/]+)\.html/) || [])[1];
}

/** BEGIN TEST CASES **/
var testCases = [
  {
    "type": "web",
    "url": "https://rl.talis.com/3/lincoln/items/FEB50B30-652C-55B2-08F8-F2D399BF308A.html",
    "defer": true,
    "items": [
      {
        "itemType": "book",
        "title": "American cultural studies: an introduction to American culture",
        "creators": [
          {
            "lastName": "Campbell",
            "firstName": "Neil",
            "creatorType": "author"
          },
          {
            "lastName": "Kean",
            "firstName": "Alasdair",
            "creatorType": "author"
          }
        ],
        "date": "2006",
        "ISBN": "9780415346665",
        "edition": "2nd ed",
        "libraryCatalog": "Talis Aspire",
        "place": "London",
        "publisher": "Routledge",
        "shortTitle": "American cultural studies",
        "attachments": [],
        "tags": [],
        "notes": [
          {
            "note": "<p>Ebook version of first edition also available</p>"
          }
        ],
        "seeAlso": []
      }
    ]
  },
  {
    "type": "web",
    "url": "http://lists.library.lincoln.ac.uk/lists/625177C4-A268-8971-E3C9-ACEA91A83585.html",
    "defer": true,
    "items": "multiple"
  },
  {
    "type": "web",
    "url": "https://rl.talis.com/3/qmul/items/66C2A847-80C3-8259-46AB-0DB8C0779068.html",
    "defer": true,
    "items": [
      {
        "itemType": "journalArticle",
        "title": "The Struggle against Sweatshops: Moving toward Responsible Global Business",
        "creators": [
          {
            "lastName": "Tara J. Radin and Martin Calkins",
            "creatorType": "author",
            "fieldMode": 1
          }
        ],
        "date": "Jul., 2006",
        "ISSN": "01674544",
        "issue": "No. 2",
        "libraryCatalog": "Talis Aspire",
        "pages": "261-272",
        "publicationTitle": "Journal of Business Ethics",
        "shortTitle": "The Struggle against Sweatshops",
        "url": "http://www.jstor.org/stable/25123831",
        "volume": "Vol. 66",
        "attachments": [],
        "tags": [],
        "notes": [],
        "seeAlso": []
      }
    ]
  },
  {
    "type": "web",
    "url": "https://rl.talis.com/3/bournemouth/items/AF2E5676-6A86-DCDC-FC7B-8CC554EFD9BF.html",
    "defer": true,
    "items": [
      {
        "itemType": "book",
        "title": "The Unified Modeling Language reference manual",
        "creators": [
          {
            "lastName": "Rumbaugh",
            "firstName": "James",
            "creatorType": "author"
          },
          {
            "lastName": "Jacobson",
            "firstName": "Ivar",
            "creatorType": "author"
          },
          {
            "lastName": "Booch",
            "firstName": "Grady",
            "creatorType": "author"
          }
        ],
        "date": "0000 c",
        "ISBN": "9780201309980",
        "libraryCatalog": "Talis Aspire",
        "place": "Harlow",
        "publisher": "Addison Wesley",
        "volume": "The Addison-Wesley object technology series",
        "attachments": [],
        "tags": [],
        "notes": [],
        "seeAlso": []
      }
    ]
  },
  {
    "type": "web",
    "url": "https://rl.talis.com/3/coventry/items/1CC2D394-7EDE-8DE5-4FF0-868C1C6E6BE5.html",
    "defer": true,
    "items": [
      {
        "itemType": "book",
        "title": "Decision making in midwifery practice",
        "creators": [
          {
            "lastName": "Marshall",
            "firstName": "Jayne E",
            "creatorType": "author"
          },
          {
            "lastName": "Raynor",
            "firstName": "Maureen D",
            "creatorType": "author"
          },
          {
            "lastName": "Sullivan",
            "firstName": "Amanda",
            "creatorType": "author"
          }
        ],
        "date": "2005",
        "ISBN": "9780443073847",
        "libraryCatalog": "Talis Aspire",
        "place": "Edinburgh",
        "publisher": "Elsevier/Churchill Livingstone",
        "attachments": [],
        "tags": [],
        "notes": [],
        "seeAlso": []
      }
    ]
  },
  {
    "type": "web",
    "url": "https://rl.talis.com/3/cyprus_uclan/items/57E6E313-82BF-0AF6-C0E5-940A3760507C.html",
    "defer": true,
    "items": [
      {
        "itemType": "book",
        "title": "Neocleous's introduction to Cyprus law",
        "creators": [
          {
            "lastName": "Neocleous",
            "firstName": "Andreas",
            "creatorType": "author"
          },
          {
            "lastName": "Andreas Neocleous & Co",
            "creatorType": "author",
            "fieldMode": 1
          }
        ],
        "date": "2010",
        "ISBN": "9789963935918",
        "edition": "3rd ed",
        "libraryCatalog": "Talis Aspire",
        "place": "Limassol, Cyprus",
        "publisher": "A. Neocleous & Co. LLC",
        "attachments": [],
        "tags": [],
        "notes": [],
        "seeAlso": []
      }
    ]
  },
  {
    "type": "web",
    "url": "https://rl.talis.com/3/derby/items/F9F66F67-142C-B05D-7401-22037C676876.html",
    "defer": true,
    "items": [
      {
        "itemType": "book",
        "title": "Preparing to teach in the lifelong learning sector: the new award",
        "creators": [
          {
            "lastName": "Gravells",
            "firstName": "Ann",
            "creatorType": "author"
          }
        ],
        "date": "2012",
        "ISBN": "9780857257734",
        "edition": "5th ed",
        "libraryCatalog": "Talis Aspire",
        "place": "London",
        "publisher": "Learning Matters",
        "shortTitle": "Preparing to teach in the lifelong learning sector",
        "attachments": [],
        "tags": [],
        "notes": [
          {
            "note": "<p>Earlier editions are available in the Library.</p>"
          }
        ],
        "seeAlso": []
      }
    ]
  }
]
/** END TEST CASES **/


/**
 * Extract the anonymous access token from the page.
 * First tries window.shipshape, then falls back to regex extraction from script tags.
 * @param {Document} doc - The document
 * @returns {string|null} - The token or null if not found
 */
function getAnonymousAccessToken(doc) {
  // Try to get from window.shipshape first
  if (doc && doc.defaultView && doc.defaultView.shipshape) {
    var token = doc.defaultView.shipshape.config?.tenant?.anonymousAccessToken;
    if (token) {
      safeLog("TALIS-ASPIRE-CUSTOM: Token found via defaultView.shipshape");
      return token;
    }
  }

  // Fallback: extract token directly from script tag using regex
  var scripts = doc.querySelectorAll("script");
  for (var i = 0; i < scripts.length; i++) {
    var scriptContent = scripts[i].textContent;
    if (scriptContent && scriptContent.includes("anonymousAccessToken")) {
      // Match: "anonymousAccessToken": "eyJ..." or 'anonymousAccessToken': 'eyJ...'
      // The token is a JWT so it contains alphanumeric chars, dots, underscores, and hyphens
      var tokenMatch = scriptContent.match(/["']?anonymousAccessToken["']?\s*:\s*["']([^"']+)["']/);
      if (tokenMatch && tokenMatch[1]) {
        var token = tokenMatch[1];
        safeLog("TALIS-ASPIRE-CUSTOM: Token found via regex extraction", token);
        return token;
      }
    }
  }

  safeLog("TALIS-ASPIRE-CUSTOM: No anonymous access token found");
  return null;
}

function getAuthenticationHeaders(doc, url) {
  var token = getAnonymousAccessToken(doc);
  if (!token) {
    safeLog("TALIS-ASPIRE-CUSTOM: WARNING - No auth token found, API calls may fail");
    return {};
  }
  return {
    "Authorization": "Bearer " + token
  };
}

function getTalisBaseAPIUrl(url) {
  // url without the trailing .html or params
  url = new URL(url);
  url.pathname = url.pathname.replace(/\.html$/, "");
  url.search = "";
  safeLog("TALIS-ASPIRE-CUSTOM: getTalisBaseAPIUrl", url);
  return url
}

/* E.g. https://rl.talis.com/3/ucl/lists/99449747-A091-3F6D-E08A-965F4A5C3149/items?include=content,importance,resource.part_of&page%5Blimit%5D=400 */
function getTalisItemAPIUrl(url, page = null, limit = 200) {
  var baseUrl = new URL(getTalisBaseAPIUrl(url));
  baseUrl.pathname = `${baseUrl.pathname}/items`;
  // ?include=content,importance,resource,resource.part_of&page%5Blimit%5D=200 
  // Note: 'resource' is needed to get titles from the included resources
  baseUrl.searchParams.set("include", "content,importance,resource.part_of");
  baseUrl.searchParams.set("page[limit]", "200");
  safeLog("TALIS-ASPIRE-CUSTOM: getTalisItemAPIUrl", baseUrl.toString());
  return baseUrl.toString();
}

// TODO: handle pagination
// https://rl.talis.com/3/ucl/lists/99449747-A091-3F6D-E08A-965F4A5C3149/items?include=content,importance,resource.part_of&page%5Blimit%5D=200&page%5Boffset%5D=200

/* E.g. https://rl.talis.com/3/ucl/lists/99449747-A091-3F6D-E08A-965F4A5C3149?include=license,nodes,owners,period,rolled_over_from,rolled_over_to,sections_recursively,tenant.bookstores,tenant.citation_styles,tenant.importances,tenant.licenses,tenant.periods,tenant.reports,tenant.tags */
function getTalisCollectionAPIUrl(url) {
  var baseUrl = new URL(getTalisBaseAPIUrl(url));
  baseUrl.searchParams.set("include", "license,nodes,owners,period,rolled_over_from,rolled_over_to,sections_recursively,tenant.bookstores,tenant.citation_styles,tenant.importances,tenant.licenses,tenant.periods,tenant.reports,tenant.tags");
  safeLog("TALIS-ASPIRE-CUSTOM: getTalisCollectionAPIUrl", baseUrl.toString());
  return baseUrl.toString();
}

/* ============================================================================
// Technical documentation


// =========
// API ENDPOINT: GET ALL ITEM DATA
// =========
// TAILS gets all item data (including UUID and RIS-compatible data, including DOIs and ISBNs) via the API: {}/lists/99449747-A091-3F6D-E08A-965F4A5C3149/items?include=content,importance,resource.part_of&page%5Blimit%5D=400 

Note the default_online_resource (crucial for translators to work) and the relationships.importance.data (crucial for syllabus metadata).

{
    "meta": {
        "total": 223,
        "item_count": 223
    },
    "links": {
        "self": "https://rl.talis.com/3/ucl/lists/99449747-A091-3F6D-E08A-965F4A5C3149/items?include=content%2Cimportance%2Cresource.part_of&page%5Boffset%5D=0&page%5Blimit%5D=200",
        "first": "https://rl.talis.com/3/ucl/lists/99449747-A091-3F6D-E08A-965F4A5C3149/items?include=content%2Cimportance%2Cresource.part_of&page%5Boffset%5D=0&page%5Blimit%5D=200",
        "last": "https://rl.talis.com/3/ucl/lists/99449747-A091-3F6D-E08A-965F4A5C3149/items?include=content%2Cimportance%2Cresource.part_of&page%5Boffset%5D=200&page%5Blimit%5D=200",
        "next": "https://rl.talis.com/3/ucl/lists/99449747-A091-3F6D-E08A-965F4A5C3149/items?include=content%2Cimportance%2Cresource.part_of&page%5Boffset%5D=200&page%5Blimit%5D=200"
    },
    "data": [
        {
            "type": "items",
            "id": "C0597536-F8BD-8217-C6D5-75AEA0099EFE",
            "attributes": {
                "student_note": "On the linked webpage, please scroll down and click 'Bloomsbury Cultural History' to access this chapter."
            },
            "relationships": {
                "content": {
                    "data": null
                },
                "importance": {
                    "data": null
                },
                "resource": {
                    "data": {
                        "type": "resources",
                        "id": "2B65DE10-3C7A-62DC-E4DB-87B8D39734FF"
                    }
                },
                "rolled_over_from": {
                    "data": {
                        "type": "items",
                        "id": "638943A0-6346-F307-BB73-A04C8E168334"
                    }
                }
            },
            "links": {
                "self": "https://rl.talis.com/3/ucl/items/C0597536-F8BD-8217-C6D5-75AEA0099EFE"
            },
            "meta": {
                "default_online_resource": {
                    "external_url": "/link?url=http%3A%2F%2Flibproxy.ucl.ac.uk%2Flogin%3Fqurl%3Dhttps%253A%252F%252Fdoi.org%252F10.5040%252F9781350035218.ch-005&sig=a4ff41f6c937ba353372657e7a75b7d16c604f349e7deb2474262bf5b66d50b1",
                    "original_property": "10.5040/9781350035218.ch-005",
                    "original_url": "https://doi.org/10.5040/9781350035218.ch-005",
                    "proxied_url": "http://libproxy.ucl.ac.uk/login?qurl=https%3A%2F%2Fdoi.org%2F10.5040%2F9781350035218.ch-005",
                    "type": "doi"
                },
                "created_datetime": "2022-09-29T12:25:26+00:00",
                "has_file_upload": false
            }
        },
        {
            "type": "items",
            "id": "27B7B3B2-5D9A-7D6A-8565-3849A55C3B34",
            "attributes": {
                "student_note": ""
            },
            "relationships": {
                "content": {
                    "data": null
                },
                "importance": {
                    "data": null
                },
                "resource": {
                    "data": {
                        "type": "resources",
                        "id": "73A83323-8EAB-8B53-DDD8-91C13876D619"
                    }
                },
                "rolled_over_from": {
                    "data": {
                        "type": "items",
                        "id": "2A4038B8-9C8B-C0E8-84E5-29BC74B5B00B"
                    }
                }
            },
            "links": {
                "self": "https://rl.talis.com/3/ucl/items/27B7B3B2-5D9A-7D6A-8565-3849A55C3B34"
            },
            "meta": {
                "default_online_resource": {
                    "external_url": "/link?url=http%3A%2F%2Flibproxy.ucl.ac.uk%2Flogin%3Fqurl%3Dhttps%253A%252F%252Fdoi.org%252F10.4324%252F9780203828854&sig=1f3327a83cdd2b7acbd8692cdf02e9db271c846cb61afee3430141de2f4602ab",
                    "original_property": "10.4324/9780203828854",
                    "original_url": "https://doi.org/10.4324/9780203828854",
                    "proxied_url": "http://libproxy.ucl.ac.uk/login?qurl=https%3A%2F%2Fdoi.org%2F10.4324%2F9780203828854",
                    "type": "doi"
                },
                "created_datetime": "2020-09-25T12:55:09+00:00",
                "has_file_upload": false
            }
        },
        {
            "type": "items",
            "id": "D922CA05-AA72-9352-3204-E34408FA6BAE",
            "attributes": {
                "student_note": ""
            },
            "relationships": {
                "content": {
                    "data": null
                },
                "importance": {
                    "data": null
                },
                "resource": {
                    "data": {
                        "type": "resources",
                        "id": "E750A72E-5308-4C14-2A9C-549BB5315583"
                    }
                },
                "rolled_over_from": {
                    "data": {
                        "type": "items",
                        "id": "49B44231-54B6-B422-EBB8-50B3399175D8"
                    }
                }
            },
            "links": {
                "self": "https://rl.talis.com/3/ucl/items/D922CA05-AA72-9352-3204-E34408FA6BAE"
            },
            "meta": {
                "default_online_resource": {
                    "external_url": "/link?url=http%3A%2F%2Flibproxy.ucl.ac.uk%2Flogin%3Fqurl%3Dhttps%253A%252F%252Fdoi.org%252F10.1080%252F00467600304154&sig=f9df87ccc7bd6efecebdb088dc9885b90f857f1d7abf78afd551b814ec6e38b3",
                    "original_property": "10.1080/00467600304154",
                    "original_url": "https://doi.org/10.1080/00467600304154",
                    "proxied_url": "http://libproxy.ucl.ac.uk/login?qurl=https%3A%2F%2Fdoi.org%2F10.1080%2F00467600304154",
                    "type": "doi"
                },
                "created_datetime": "2017-10-12T14:15:01+01:00",
                "has_file_upload": false
            }
        },
        {
            "type": "items",
            "id": "296AD6C7-57C8-DBB3-8191-52D9787184DE",
            "attributes": {
                "student_note": ""
            },
            "relationships": {
                "content": {
                    "data": null
                },
                "importance": {
                    "data": null
                },
                "resource": {
                    "data": {
                        "type": "resources",
                        "id": "C79E7A6A-DBEE-4C36-8ECA-7469569FD55F"
                    }
                },
                "rolled_over_from": {
                    "data": {
                        "type": "items",
                        "id": "CC6AAD02-1408-0DBF-5262-884C9A1219BE"
                    }
                }
            },
            "links": {
                "self": "https://rl.talis.com/3/ucl/items/296AD6C7-57C8-DBB3-8191-52D9787184DE"
            },
            "meta": {
                "default_online_resource": {
                    "isbns": [
                        "0415358914",
                        "0415358922"
                    ],
                    "type": "google_books"
                },
                "created_datetime": "2017-10-12T14:14:18+01:00",
                "has_file_upload": false
            }
        },
        {
            "type": "items",
            "id": "38925726-40F3-647A-6124-9BB26AAAEA1C",
            "attributes": {
                "student_note": ""
            },
            "relationships": {
                "content": {
                    "data": null
                },
                "importance": {
                    "data": null
                },
                "resource": {
                    "data": {
                        "type": "resources",
                        "id": "CBE3DB73-89E8-298F-F204-08971333119E"
                    }
                },
                "rolled_over_from": {
                    "data": {
                        "type": "items",
                        "id": "5EE0F0BE-1169-A084-BBE5-FB76E1447595"
                    }
                }
            },
            "links": {
                "self": "https://rl.talis.com/3/ucl/items/38925726-40F3-647A-6124-9BB26AAAEA1C"
            },
            "meta": {
                "default_online_resource": {
                    "external_url": "/link?url=https%3A%2F%2Fucl-new-primo.hosted.exlibrisgroup.com%2Fopenurl%2FUCL%2FUCL_VU2%3Fctx_ver%3DZ39.88-2004%26rft.btitle%3DConnecting%2Bhistories%2Bof%2Beducation%253A%2Btransnational%2Band%2Bcross-cultural%2Bexchanges%2Bin%2B%2528post-%2529colonial%2Beducation%26rft.place%3DNew%2BYork%252C%2B%255BNew%2BYork%255D%26rft.pub%3DBerghahn%2BBooks%26rft.isbn%3D1782382674%26rft.date%3D2014%26rft.aufirst%3DBarnita%26rft.aulast%3DBagchi&sig=00e2914ff12e106b92f53228b4ee023dfae5b96da5dceabf0367c5262f2d5725",
                    "original_url": "http://ucl.alma.exlibrisgroup.com/view/action/uresolver.do?operation=resolveService&amp;package_service_id=3922756020004761&amp;institutionId=4761&amp;customerId=4760",
                    "proxied_url": "https://ucl-new-primo.hosted.exlibrisgroup.com/openurl/UCL/UCL_VU2?ctx_ver=Z39.88-2004&rft.btitle=Connecting+histories+of+education%3A+transnational+and+cross-cultural+exchanges+in+%28post-%29colonial+education&rft.place=New+York%2C+%5BNew+York%5D&rft.pub=Berghahn+Books&rft.isbn=1782382674&rft.date=2014&rft.aufirst=Barnita&rft.aulast=Bagchi",
                    "type": "ebook"
                },
                "created_datetime": "2019-02-27T16:13:41+00:00",
                "has_file_upload": false
            }
        },
        {
            "type": "items",
            "id": "29B3D9E9-3521-3A4B-1057-0385FE65CEDA",
            "attributes": {
                "student_note": ""
            },
            "relationships": {
                "content": {
                    "data": null
                },
                "importance": {
                    "data": null
                },
                "resource": {
                    "data": {
                        "type": "resources",
                        "id": "4F2DFD47-9B43-16C7-FC77-A7A80A408574"
                    }
                },
                "rolled_over_from": {
                    "data": {
                        "type": "items",
                        "id": "262BC096-19DF-E814-7843-B979BC40B7F9"
                    }
                }
            },
            "links": {
                "self": "https://rl.talis.com/3/ucl/items/29B3D9E9-3521-3A4B-1057-0385FE65CEDA"
            },
            "meta": {
                "default_online_resource": {
                    "isbns": [
                        "0820439401"
                    ],
                    "type": "google_books"
                },
                "created_datetime": "2017-10-12T14:17:17+01:00",
                "has_file_upload": false
            }
        },
        {
            "type": "items",
            "id": "35B93881-21E0-4FD2-993B-DFC8347C9C67",
            "attributes": {
                "student_note": ""
            },
            "relationships": {
                "content": {
                    "data": null
                },
                "importance": {
                    "data": null
                },
                "resource": {
                    "data": {
                        "type": "resources",
                        "id": "7DF1226A-9453-4EC0-555D-E7CEC00FA51C"
                    }
                },
                "rolled_over_from": {
                    "data": {
                        "type": "items",
                        "id": "FE695597-44DF-DB46-936D-F4F4F45C5574"
                    }
                }
            },
            "links": {
                "self": "https://rl.talis.com/3/ucl/items/35B93881-21E0-4FD2-993B-DFC8347C9C67"
            },
            "meta": {
                "default_online_resource": {
                    "isbns": [
                        "0854736190"
                    ],
                    "type": "google_books"
                },
                "created_datetime": "2017-10-12T14:17:59+01:00",
                "has_file_upload": false
            }
        },
        {
            "type": "items",
            "id": "383D8170-71BC-7CBF-49C4-88F96EB451D4",
            "attributes": {
                "student_note": ""
            },
            "relationships": {
                "content": {
                    "data": null
                },
                "importance": {
                    "data": null
                },
                "resource": {
                    "data": {
                        "type": "resources",
                        "id": "1FC1F86E-2C30-7E5C-5772-5088318DF4C7"
                    }
                },
                "rolled_over_from": {
                    "data": {
                        "type": "items",
                        "id": "D150AAAB-4B25-CC7F-9B1A-C1F4E4373326"
                    }
                }
            },
            "links": {
                "self": "https://rl.talis.com/3/ucl/items/383D8170-71BC-7CBF-49C4-88F96EB451D4"
            },
            "meta": {
                "default_online_resource": {
                    "external_url": "/link?url=http%3A%2F%2Fwww.jstor.org%2Fstable%2F10.2307%2Fj.ctt9qdwdd&sig=8ae49f29e890fcbc2b1643dc3c51a8d591a32b6a7ea5be0cb6302fbf1c91265f",
                    "original_url": "http://www.jstor.org/stable/10.2307/j.ctt9qdwdd",
                    "proxied_url": "http://www.jstor.org/stable/10.2307/j.ctt9qdwdd",
                    "type": "ebook"
                },
                "created_datetime": "2019-01-10T14:35:04+00:00",
                "has_file_upload": false
            }
        },
        {
            "type": "items",
            "id": "A2EB0913-64E8-6717-BCF0-CFE023117673",
            "attributes": {
                "student_note": ""
            },
            "relationships": {
                "content": {
                    "data": null
                },
                "importance": {
                    "data": null
                },
                "resource": {
                    "data": {
                        "type": "resources",
                        "id": "F1F78D05-6854-65EE-A68E-06C98445419C"
                    }
                },
                "rolled_over_from": {
                    "data": {
                        "type": "items",
                        "id": "C1ED0A51-2E80-E4ED-DC09-CE51CCDE343E"
                    }
                }
            },
            "links": {
                "self": "https://rl.talis.com/3/ucl/items/A2EB0913-64E8-6717-BCF0-CFE023117673"
            },
            "meta": {
                "default_online_resource": {
                    "isbns": [
                        "0203860128",
                        "0415353378",
                        "0415353386"
                    ],
                    "type": "google_books"
                },
                "created_datetime": "2017-10-12T14:19:28+01:00",
                "has_file_upload": false
            }
        },
        {
            "type": "items",
            "id": "DA259FEC-0C0D-4669-5931-AFD81EA67577",
            "attributes": {
                "student_note": ""
            },
            "relationships": {
                "content": {
                    "data": null
                },
                "importance": {
                    "data": null
                },
                "resource": {
                    "data": {
                        "type": "resources",
                        "id": "5A0AB978-DDFE-B098-4983-F1449B928B8E"
                    }
                },
                "rolled_over_from": {
                    "data": {
                        "type": "items",
                        "id": "F238CBF2-9A40-2730-BFE2-49324BEBF4C7"
                    }
                }
            },
            "links": {
                "self": "https://rl.talis.com/3/ucl/items/DA259FEC-0C0D-4669-5931-AFD81EA67577"
            },
            "meta": {
                "default_online_resource": {
                    "external_url": "/link?url=http%3A%2F%2Flibproxy.ucl.ac.uk%2Flogin%3Fqurl%3Dhttps%253A%252F%252Fdoi.org%252F10.1080%252F0030923990350308&sig=dc9a1de105593f3abe00bc08dfda27c0cfb9cffa15f851420023709870b37635",
                    "original_property": "10.1080/0030923990350308",
                    "original_url": "https://doi.org/10.1080/0030923990350308",
                    "proxied_url": "http://libproxy.ucl.ac.uk/login?qurl=https%3A%2F%2Fdoi.org%2F10.1080%2F0030923990350308",
                    "type": "doi"
                },
                "created_datetime": "2017-10-12T14:20:12+01:00",
                "has_file_upload": false
            }
        },
        {
            "type": "items",
            "id": "419D9FB0-E31D-A02C-0360-73822D62A4CF",
            "attributes": {
                "student_note": "Not currently available at UCL Library."
            },
            "relationships": {
                "content": {
                    "data": null
                },
                "importance": {
                    "data": null
                },
                "resource": {
                    "data": {
                        "type": "resources",
                        "id": "6A020FF1-382B-2CB3-57F6-67196533F072"
                    }
                },
                "rolled_over_from": {
                    "data": {
                        "type": "items",
                        "id": "E4CC0CBB-C789-2A84-2EC0-17192609C8EE"
                    }
                }
            },
            "links": {
                "self": "https://rl.talis.com/3/ucl/items/419D9FB0-E31D-A02C-0360-73822D62A4CF"
            },
            "meta": {
                "default_online_resource": {
                    "isbns": [
                        "9783825815615"
                    ],
                    "type": "google_books"
                },
                "created_datetime": "2023-05-11T09:21:44+00:00",
                "has_file_upload": false
            }
        },
        {
            "type": "items",
            "id": "224D4CB5-8BB9-2DB8-9257-430694C42C59",
            "attributes": {
                "student_note": ""
            },
            "relationships": {
                "content": {
                    "data": null
                },
                "importance": {
                    "data": null
                },
                "resource": {
                    "data": {
                        "type": "resources",
                        "id": "0AA79497-41F1-4156-594E-85813E605E8E"
                    }
                },
                "rolled_over_from": {
                    "data": {
                        "type": "items",
                        "id": "1A8014FC-AE55-5102-4350-171E2AB6E890"
                    }
                }
            },
            "links": {
                "self": "https://rl.talis.com/3/ucl/items/224D4CB5-8BB9-2DB8-9257-430694C42C59"
            },
            "meta": {
                "default_online_resource": {
                    "external_url": "/link?url=http%3A%2F%2Fweb.stanford.edu%2F~dlabaree%2Fpublication2011%2FSermon_on_Educational_Research_Debate.pdf&sig=c33f9fff30e7789398861ac44b9742666797b05c929fc217c601654da7f51ded",
                    "original_url": "http://web.stanford.edu/~dlabaree/publication2011/Sermon_on_Educational_Research_Debate.pdf",
                    "proxied_url": "http://web.stanford.edu/~dlabaree/publication2011/Sermon_on_Educational_Research_Debate.pdf",
                    "type": "web"
                },
                "created_datetime": "2017-10-12T14:22:10+01:00",
                "has_file_upload": false
            }
        },
        {
            "type": "items",
            "id": "465031C5-2CC0-9BAB-C79D-B35938A4BD11",
            "attributes": {
                "student_note": ""
            },
            "relationships": {
                "content": {
                    "data": null
                },
                "importance": {
                    "data": null
                },
                "resource": {
                    "data": {
                        "type": "resources",
                        "id": "38DFC496-886B-B5C3-B186-6EA64816254F"
                    }
                },
                "rolled_over_from": {
                    "data": {
                        "type": "items",
                        "id": "0544F147-3D03-301B-BA6D-C37EF5C5E057"
                    }
                }
            },
            "links": {
                "self": "https://rl.talis.com/3/ucl/items/465031C5-2CC0-9BAB-C79D-B35938A4BD11"
            },
            "meta": {
                "default_online_resource": {
                    "external_url": "/link?url=http%3A%2F%2Flibproxy.ucl.ac.uk%2Flogin%3Fqurl%3Dhttps%253A%252F%252Fdoi.org%252F10.1080%252F00467600210167055&sig=a81c3e028358938b59785a1f37ec6e6baa4d955e6fcbcf5343f50e13e04d16a8",
                    "original_property": "10.1080/00467600210167055",
                    "original_url": "https://doi.org/10.1080/00467600210167055",
                    "proxied_url": "http://libproxy.ucl.ac.uk/login?qurl=https%3A%2F%2Fdoi.org%2F10.1080%2F00467600210167055",
                    "type": "doi"
                },
                "created_datetime": "2017-10-12T14:22:40+01:00",
                "has_file_upload": false
            }
        },
        {
            "type": "items",
            "id": "5018A257-A470-8009-944F-91FEE5DCECBB",
            "attributes": {
                "student_note": ""
            },
            "relationships": {
                "content": {
                    "data": null
                },
                "importance": {
                    "data": null
                },
                "resource": {
                    "data": {
                        "type": "resources",
                        "id": "50E13393-BFFC-CA94-8A05-BCAEE785E0F7"
                    }
                },
                "rolled_over_from": {
                    "data": {
                        "type": "items",
                        "id": "B9F97D2D-CE74-8650-B3A4-6AF9959553FD"
                    }
                }
            },
            "links": {
                "self": "https://rl.talis.com/3/ucl/items/5018A257-A470-8009-944F-91FEE5DCECBB"
            },
            "meta": {
                "default_online_resource": {
                    "isbns": [
                        "0415140463",
                        "0415140471",
                        "041514048X",
                        "0415140498",
                        "0415140501"
                    ],
                    "type": "google_books"
                },
                "created_datetime": "2017-10-12T14:23:19+01:00",
                "has_file_upload": false
            }
        },
        {
            "type": "items",
            "id": "9D52E0A2-BB90-188B-EC1F-05FD59F5A064",
            "attributes": {
                "student_note": ""
            },
            "relationships": {
                "content": {
                    "data": null
                },
                "importance": {
                    "data": null
                },
                "resource": {
                    "data": {
                        "type": "resources",
                        "id": "3CBE0838-BC61-4FFD-7926-8D53A6A7F377"
                    }
                },
                "rolled_over_from": {
                    "data": {
                        "type": "items",
                        "id": "A8569ADE-69DB-A0F4-DDB6-7BA0A23C0BA1"
                    }
                }
            },
            "links": {
                "self": "https://rl.talis.com/3/ucl/items/9D52E0A2-BB90-188B-EC1F-05FD59F5A064"
            },
            "meta": {
                "default_online_resource": {
                    "isbns": [
                        "9780415549394",
                        "9780415549400",
                        "9780415549417",
                        "9780415549424",
                        "9780415549431"
                    ],
                    "type": "google_books"
                },
                "created_datetime": "2017-10-12T14:24:28+01:00",
                "has_file_upload": false
            }
        },
        {
            "type": "items",
            "id": "925B8AF3-645E-D22E-DBC8-EF6F6A5C7A12",
            "attributes": {
                "student_note": ""
            },
            "relationships": {
                "content": {
                    "data": null
                },
                "importance": {
                    "data": null
                },
                "resource": {
                    "data": {
                        "type": "resources",
                        "id": "110EDC64-D11E-47CD-14A9-FAA0E157E903"
                    }
                },
                "rolled_over_from": {
                    "data": {
                        "type": "items",
                        "id": "847DAA59-CC7D-8215-4766-EDAAA327D97B"
                    }
                }
            },
            "links": {
                "self": "https://rl.talis.com/3/ucl/items/925B8AF3-645E-D22E-DBC8-EF6F6A5C7A12"
            },
            "meta": {
                "default_online_resource": {
                    "external_url": "/link?url=https%3A%2F%2Fucl-new-primo.hosted.exlibrisgroup.com%2Fopenurl%2FUCL%2FUCL_VU2%3Fctx_ver%3DZ39.88-2004%26rft.btitle%3DDocumentary%2Bresearch%2Bin%2Beducation%252C%2Bhistory%2Band%2Bthe%2Bsocial%2Bsciences%26rft.volume%3D22%26rft.place%3DLondon%26rft.pub%3DRoutledgeFalmer%26rft.isbn%3D0415272866%26rft.isbn%3D0415272874%26rft.date%3D2004%26rft.aufirst%3DGary%26rft.aulast%3DMcCulloch&sig=4b23cef8318f7855f1b40823c6c131b9725b7b7e5cd96c63201ce0ded6816434",
                    "original_url": "https://ucl.userservices.exlibrisgroup.com/view/action/uresolver.do?operation=resolveService&amp;package_service_id=3962305500004761&amp;institutionId=4761&amp;customerId=4760",
                    "proxied_url": "https://ucl-new-primo.hosted.exlibrisgroup.com/openurl/UCL/UCL_VU2?ctx_ver=Z39.88-2004&rft.btitle=Documentary+research+in+education%2C+history+and+the+social+sciences&rft.volume=22&rft.place=London&rft.pub=RoutledgeFalmer&rft.isbn=0415272866&rft.isbn=0415272874&rft.date=2004&rft.aufirst=Gary&rft.aulast=McCulloch",
                    "type": "ebook"
                },
                "created_datetime": "2019-01-10T14:35:14+00:00",
                "has_file_upload": false
            }
        }
    ]
}

// =========
// API ENDPOINT: GET ALL COLLECTION DATA
// =========

// It also gets collection data via the API: {}/lists/99449747-A091-3F6D-E08A-965F4A5C3149?include=license,nodes,owners,period,rolled_over_from,rolled_over_to,sections_recursively,tenant.bookstores,tenant.citation_styles,tenant.importances,tenant.licenses,tenant.periods,tenant.reports,tenant.tags 

Note included
- importances is_active — priority list
- tenants.name — university name
- type-modules-attributes code / title / description — for syllabus metadata

{
    "data": {
        "type": "lists",
        "id": "99449747-A091-3F6D-E08A-965F4A5C3149",
        "attributes": {
            "title": "EDPS0045: Debates in the History of Education",
            "date_created": "2025-07-08T20:51:28+00:00",
            "last_published": "2025-07-08T20:51:32+00:00",
            "last_updated": "2025-07-08T20:51:28+00:00",
            "list_access": null,
            "published_status": "published",
            "is_private": false,
            "description": "Autumn 2022\nModule leader: Tom Woodin",
            "student_numbers": null
        },
        "relationships": {
            "tenant": {
                "data": {
                    "type": "tenants",
                    "id": "ucl"
                }
            },
            "sections_recursively": {
                "data": [
                    {
                        "type": "sections",
                        "id": "A9826797-98A0-FF9C-8ACF-D17CFE8C4826"
                    },
                    {
                        "type": "sections",
                        "id": "FA056CB3-D2B1-E2B2-7820-C778DFCCF2C4"
                    },
                    {
                        "type": "sections",
                        "id": "4EE69CB8-00A3-32C7-034C-BC5D09C1E5CD"
                    },
                    {
                        "type": "sections",
                        "id": "0FCF8356-E6D5-5747-3077-A9AC78B70623"
                    },
                    {
                        "type": "sections",
                        "id": "610B79CA-E477-E0CB-156F-E128AA5022BD"
                    },
                    {
                        "type": "sections",
                        "id": "60E7F807-9E43-D975-BEDF-C2E1ABFFA950"
                    },
                    {
                        "type": "sections",
                        "id": "945F0807-D54C-A463-FCF0-B7DE5FEB0A90"
                    },
                    {
                        "type": "sections",
                        "id": "512FB27A-2CDC-082C-D502-F9C9DCB47078"
                    },
                    {
                        "type": "sections",
                        "id": "18153EB1-B70E-A54F-B868-FE1B58AC8C6B"
                    },
                    {
                        "type": "sections",
                        "id": "37506861-A6C6-1CF4-7F6E-3DC03D8097C6"
                    },
                    {
                        "type": "sections",
                        "id": "CE891220-82AA-AD2C-7940-3E0B91D2C706"
                    },
                    {
                        "type": "sections",
                        "id": "34721D3E-A609-2B2F-2826-A4FB9EA5EF1D"
                    },
                    {
                        "type": "sections",
                        "id": "93FA9CB7-9FC2-89A9-F7F8-300597369A08"
                    },
                    {
                        "type": "sections",
                        "id": "B47617EC-B7A6-FD00-9A38-DCE23CBACB7D"
                    },
                    {
                        "type": "sections",
                        "id": "33A5D285-63A2-4930-6672-A6AC84E62049"
                    },
                    {
                        "type": "sections",
                        "id": "47D58060-C434-8DC5-0F7C-F77A639890BD"
                    },
                    {
                        "type": "sections",
                        "id": "9F596567-D905-FCB0-0DEE-6854A5007352"
                    },
                    {
                        "type": "sections",
                        "id": "B8E4194C-D209-1FB1-55B8-4908A1EF583D"
                    },
                    {
                        "type": "sections",
                        "id": "CDDD4BC3-9975-AC17-364C-2C3107EB274F"
                    },
                    {
                        "type": "sections",
                        "id": "00926068-9D3D-1718-2F77-E24743CFCFFF"
                    },
                    {
                        "type": "sections",
                        "id": "57D29B37-55CF-51E5-47AD-E168685D1D22"
                    },
                    {
                        "type": "sections",
                        "id": "9AC14480-E3F1-A88E-FB1B-1764C320D1FD"
                    },
                    {
                        "type": "sections",
                        "id": "C4BC0ADC-9E17-5B25-8425-6EF9A391D451"
                    },
                    {
                        "type": "sections",
                        "id": "2652F60E-4309-881F-D29D-0978909E8813"
                    },
                    {
                        "type": "sections",
                        "id": "94BF6019-DD2C-A0AB-CAC2-541BC883B660"
                    },
                    {
                        "type": "sections",
                        "id": "DF409C8E-D656-E687-F7C9-A6839BD410D7"
                    },
                    {
                        "type": "sections",
                        "id": "56A0A2D3-90E0-F608-7B95-671AFD8B4FD5"
                    },
                    {
                        "type": "sections",
                        "id": "562CDE90-8CE3-7FF6-E779-D8BF2AC5A5F6"
                    }
                ]
            },
            "all_children": {
                "data": [
                    {
                        "type": "sections",
                        "id": "A9826797-98A0-FF9C-8ACF-D17CFE8C4826"
                    },
                    {
                        "type": "sections",
                        "id": "0FCF8356-E6D5-5747-3077-A9AC78B70623"
                    },
                    {
                        "type": "sections",
                        "id": "945F0807-D54C-A463-FCF0-B7DE5FEB0A90"
                    },
                    {
                        "type": "sections",
                        "id": "CE891220-82AA-AD2C-7940-3E0B91D2C706"
                    },
                    {
                        "type": "sections",
                        "id": "B47617EC-B7A6-FD00-9A38-DCE23CBACB7D"
                    },
                    {
                        "type": "sections",
                        "id": "9F596567-D905-FCB0-0DEE-6854A5007352"
                    },
                    {
                        "type": "sections",
                        "id": "00926068-9D3D-1718-2F77-E24743CFCFFF"
                    },
                    {
                        "type": "sections",
                        "id": "C4BC0ADC-9E17-5B25-8425-6EF9A391D451"
                    },
                    {
                        "type": "sections",
                        "id": "DF409C8E-D656-E687-F7C9-A6839BD410D7"
                    }
                ]
            },
            "sections": {
                "data": [
                    {
                        "type": "sections",
                        "id": "A9826797-98A0-FF9C-8ACF-D17CFE8C4826"
                    },
                    {
                        "type": "sections",
                        "id": "0FCF8356-E6D5-5747-3077-A9AC78B70623"
                    },
                    {
                        "type": "sections",
                        "id": "945F0807-D54C-A463-FCF0-B7DE5FEB0A90"
                    },
                    {
                        "type": "sections",
                        "id": "CE891220-82AA-AD2C-7940-3E0B91D2C706"
                    },
                    {
                        "type": "sections",
                        "id": "B47617EC-B7A6-FD00-9A38-DCE23CBACB7D"
                    },
                    {
                        "type": "sections",
                        "id": "9F596567-D905-FCB0-0DEE-6854A5007352"
                    },
                    {
                        "type": "sections",
                        "id": "00926068-9D3D-1718-2F77-E24743CFCFFF"
                    },
                    {
                        "type": "sections",
                        "id": "C4BC0ADC-9E17-5B25-8425-6EF9A391D451"
                    },
                    {
                        "type": "sections",
                        "id": "DF409C8E-D656-E687-F7C9-A6839BD410D7"
                    }
                ]
            },
            "license": {
                "data": null
            },
            "nodes": {
                "data": [
                    {
                        "type": "modules",
                        "id": "edps0045"
                    }
                ]
            },
            "owners": {
                "data": [
                    {
                        "type": "users",
                        "id": "rn5LPuxDUJ00yE75imyUSw"
                    }
                ]
            },
            "period": {
                "data": {
                    "type": "periods",
                    "id": "http://readinglists.ucl.ac.uk/config/timePeriod681382a0c4441"
                }
            },
            "rolled_over_to": {
                "data": null
            },
            "rolled_over_from": {
                "data": {
                    "type": "lists",
                    "id": "62DD0D0C-7CAC-1195-8E8E-F3E8F800F3BE"
                }
            }
        },
        "links": {
            "self": "https://rl.talis.com/3/ucl/lists/99449747-A091-3F6D-E08A-965F4A5C3149",
            "items": {
                "href": "https://rl.talis.com/3/ucl/lists/99449747-A091-3F6D-E08A-965F4A5C3149/items",
                "meta": {
                    "count": 223
                }
            }
        },
        "meta": {
            "item_count": 223,
            "has_unpublished_changes": false,
            "total_student_numbers": 10
        }
    },
    "included": [
        ...
        {
            "type": "importances",
            "id": "importance1",
            "attributes": {
                "description": " ",
                "is_active": true
            }
        },
        {
            "type": "importances",
            "id": "importance2",
            "attributes": {
                "description": "Essential",
                "is_active": true
            }
        },
        {
            "type": "importances",
            "id": "importance3",
            "attributes": {
                "description": "Recommended",
                "is_active": true
            }
        },
        {
            "type": "importances",
            "id": "importance4",
            "attributes": {
                "description": "Optional",
                "is_active": true
            }
        },
        ...
        {
            "type": "periods",
            "id": "http://readinglists.ucl.ac.uk/config/timePeriod1",
            "attributes": {
                "is_active": false,
                "slug": "academic-year-201112",
                "description": "Academic Year 2011/12",
                "start_date": "2011-09-01",
                "end_date": "2012-07-31"
            }
        },
        {
            "type": "periods",
            "id": "http://readinglists.ucl.ac.uk/config/timePeriod2",
            "attributes": {
                "is_active": false,
                "slug": "academic-year-201213",
                "description": "Academic Year 2012/13",
                "start_date": "2012-09-01",
                "end_date": "2013-07-31"
            }
        },
        ...
        {
            "type": "tenants",
            "id": "ucl",
            "attributes": {
                "name": "University College London",
                "base_uri": "http://readinglists.ucl.ac.uk",
                "default_list_access": null,
                "short_code": "ucl",
                "login_provider": "ucl",
                "persona_host": "https://users.talis.com",
                "role_permission_mapping": {
                    "listcreator": [
                        "create-list"
                    ],
                    "roleadmin": [
                        "grant-any-role"
                    ],
                    "listpub": [
                        "archive-list",
                        "assign-license",
                        "create-list",
                        "edit-list",
                        "grant-this-role",
                        "publish-list",
                        "request-review",
                        "delete-list"
                    ],
                    "nodeeditor": [
                        "attach-list-to-node",
                        "edit-node",
                        "grant-this-role"
                    ],
                    "libraryacquisitions": [
                        "receive-new-review-requests-by-email",
                        "view-acquisitions"
                    ],
                    "admin": [
                        "archive-list",
                        "assign-license",
                        "create-list",
                        "edit-list",
                        "grant-any-role",
                        "grant-this-role",
                        "list-access-control",
                        "publish-list",
                        "receive-new-review-requests-by-email",
                        "request-review",
                        "view-acquisitions",
                        "idp-migration",
                        "request-rollover",
                        "upload-hierarchy",
                        "home-message",
                        "resource-metadata-refresh",
                        "view-reports",
                        "delete-list",
                        "access-keys",
                        "attach-list-to-node",
                        "perform-bulk-actions",
                        "v2-configure-list-beta",
                        "administer-settings"
                    ],
                    "v2listview": [
                        "v2-list-view"
                    ],
                    "copyright": [],
                    "tdc:app:access": [],
                    "v2listadmin": [
                        "v2-configure-list-beta",
                        "v2-list-view"
                    ],
                    "v2listedit": [
                        "v2-list-edit"
                    ],
                    "listanalytics": [],
                    "v2bookmarkingbeta": [
                        "access-v2-bookmarking"
                    ]
                },
                "default_locale": "en-GB",
                "active_locales": [
                    "en-GB"
                ],
                "required_item_importances": "off",
                "enable_talis_reader_workflow": false,
                "file_upload_cc_preference": "not_allowed",
                "file_upload_allow_upload_to_non_cc_resources": false
            },
            "relationships": {
                ...
                "importances": {
                ...
                    "data": [
                        {
                            "type": "importances",
                            "id": "importance1"
                        },
                        {
                            "type": "importances",
                            "id": "importance2"
                        },
                        {
                            "type": "importances",
                            "id": "importance3"
                        },
                        {
                            "type": "importances",
                            "id": "importance4"
                        }
                    ]
                        ...
                },
                "tags": {
                    "data": []
                }
            }
        },
        {
            "type": "sections",
            "id": "A9826797-98A0-FF9C-8ACF-D17CFE8C4826",
            "attributes": {
                "title": "Session 1 – Module introduction; history of education in perspective ",
                "description": null
            },
            "relationships": {
                "all_children": {
                    "data": [
                        {
                            "type": "sections",
                            "id": "FA056CB3-D2B1-E2B2-7820-C778DFCCF2C4"
                        },
                        {
                            "type": "sections",
                            "id": "4EE69CB8-00A3-32C7-034C-BC5D09C1E5CD"
                        }
                    ]
                },
                "sections": {
                    "data": [
                        {
                            "type": "sections",
                            "id": "FA056CB3-D2B1-E2B2-7820-C778DFCCF2C4"
                        },
                        {
                            "type": "sections",
                            "id": "4EE69CB8-00A3-32C7-034C-BC5D09C1E5CD"
                        }
                    ]
                }
            }
        },
        {
            "type": "sections",
            "id": "FA056CB3-D2B1-E2B2-7820-C778DFCCF2C4",
            "attributes": {
                "title": "Key reading",
                "description": null
            },
            "relationships": {
                "all_children": {
                    "data": [
                        {
                            "type": "items",
                            "id": "C0597536-F8BD-8217-C6D5-75AEA0099EFE"
                        },
                        {
                            "type": "items",
                            "id": "27B7B3B2-5D9A-7D6A-8565-3849A55C3B34"
                        },
                        {
                            "type": "items",
                            "id": "D922CA05-AA72-9352-3204-E34408FA6BAE"
                        }
                    ]
                },
                "sections": {
                    "data": []
                }
            }
        },
        {
            "type": "sections",
            "id": "4EE69CB8-00A3-32C7-034C-BC5D09C1E5CD",
            "attributes": {
                "title": "Other readings",
                "description": "If you get a chance, choose one other from below:     "
            },
            "relationships": {
                "all_children": {
                    "data": [
                        {
                            "type": "items",
                            "id": "296AD6C7-57C8-DBB3-8191-52D9787184DE"
                        },
                        {
                            "type": "items",
                            "id": "38925726-40F3-647A-6124-9BB26AAAEA1C"
                        },
                        {
                            "type": "items",
                            "id": "29B3D9E9-3521-3A4B-1057-0385FE65CEDA"
                        },
                        {
                            "type": "items",
                            "id": "35B93881-21E0-4FD2-993B-DFC8347C9C67"
                        },
                        {
                            "type": "items",
                            "id": "383D8170-71BC-7CBF-49C4-88F96EB451D4"
                        },
                        {
                            "type": "items",
                            "id": "A2EB0913-64E8-6717-BCF0-CFE023117673"
                        },
                        {
                            "type": "items",
                            "id": "DA259FEC-0C0D-4669-5931-AFD81EA67577"
                        },
                        {
                            "type": "items",
                            "id": "419D9FB0-E31D-A02C-0360-73822D62A4CF"
                        },
                        {
                            "type": "items",
                            "id": "224D4CB5-8BB9-2DB8-9257-430694C42C59"
                        },
                        {
                            "type": "items",
                            "id": "465031C5-2CC0-9BAB-C79D-B35938A4BD11"
                        },
                        {
                            "type": "items",
                            "id": "5018A257-A470-8009-944F-91FEE5DCECBB"
                        },
                        {
                            "type": "items",
                            "id": "9D52E0A2-BB90-188B-EC1F-05FD59F5A064"
                        },
                        {
                            "type": "items",
                            "id": "925B8AF3-645E-D22E-DBC8-EF6F6A5C7A12"
                        },
                        {
                            "type": "items",
                            "id": "98ACE2D9-0A81-E6A5-3D1F-9D4AD2EAF53C"
                        },
                        {
                            "type": "items",
                            "id": "EC83D30E-370C-9DDC-0ED7-679AEDC93865"
                        },
                        {
                            "type": "items",
                            "id": "32A1F231-C7CB-3A4C-D961-D643EC811009"
                        },
                        {
                            "type": "items",
                            "id": "D019DFEE-E3CD-AE4E-2305-DCD07D38C489"
                        },
                        {
                            "type": "items",
                            "id": "E71BCC4C-982B-0E12-B202-D5D6793D25FF"
                        },
                        {
                            "type": "items",
                            "id": "F8715E3C-A104-775D-ADFB-FF9E786088A0"
                        }
                    ]
                },
                "sections": {
                    "data": []
                }
            }
        },
        {
            "type": "sections",
            "id": "0FCF8356-E6D5-5747-3077-A9AC78B70623",
            "attributes": {
                "title": "Session 2 - Literacy",
                "description": null
            },
            "relationships": {
                "all_children": {
                    "data": [
                        {
                            "type": "sections",
                            "id": "610B79CA-E477-E0CB-156F-E128AA5022BD"
                        },
                        {
                            "type": "sections",
                            "id": "60E7F807-9E43-D975-BEDF-C2E1ABFFA950"
                        }
                    ]
                },
                "sections": {
                    "data": [
                        {
                            "type": "sections",
                            "id": "610B79CA-E477-E0CB-156F-E128AA5022BD"
                        },
                        {
                            "type": "sections",
                            "id": "60E7F807-9E43-D975-BEDF-C2E1ABFFA950"
                        }
                    ]
                }
            }
        },
        {
            "type": "sections",
            "id": "610B79CA-E477-E0CB-156F-E128AA5022BD",
            "attributes": {
                "title": "Key readings",
                "description": null
            },
            "relationships": {
                "all_children": {
                    "data": [
                        {
                            "type": "items",
                            "id": "9768A891-0BE9-0C5A-96FB-32C8ED0BFD81"
                        },
                        {
                            "type": "items",
                            "id": "30D5C3DA-9795-18CB-945D-29022BFC2F10"
                        },
                        {
                            "type": "items",
                            "id": "37F422CD-9F93-8B40-57A9-600421BEC62B"
                        }
                    ]
                },
                "sections": {
                    "data": []
                }
            }
        },
        {
            "type": "sections",
            "id": "60E7F807-9E43-D975-BEDF-C2E1ABFFA950",
            "attributes": {
                "title": "Other readings",
                "description": null
            },
            "relationships": {
                "all_children": {
                    "data": [
                        {
                            "type": "items",
                            "id": "741E3914-D44A-CBF9-9057-B6D9C7423F6C"
                        },
                        {
                            "type": "items",
                            "id": "A0B40180-128A-5B49-E0AD-F220DC56EF92"
                        },
                        {
                            "type": "items",
                            "id": "924158C7-66DD-2117-1989-7CB8A96CFB3B"
                        },
                        {
                            "type": "items",
                            "id": "4332E181-DEFC-F83B-DBAC-3C75B867E548"
                        },
                        {
                            "type": "items",
                            "id": "EB641663-B653-301F-00D5-6766251D8745"
                        },
                        {
                            "type": "items",
                            "id": "C8C10E93-850E-A744-79D3-465ACBD8A418"
                        },
                        {
                            "type": "items",
                            "id": "508D0092-251A-118C-5A7B-577EF97031CA"
                        },
                        {
                            "type": "items",
                            "id": "6E979446-F71E-26E8-4C6C-FDDD27B20F71"
                        },
                        {
                            "type": "items",
                            "id": "E48C325A-AAB9-B037-D9DA-65E595582CCB"
                        },
                        {
                            "type": "items",
                            "id": "4CE8FA69-F5D6-C4BA-B5C9-03DCEE496152"
                        },
                        {
                            "type": "items",
                            "id": "E4F4B27B-DD88-BE9F-9357-F77F52B41205"
                        },
                        {
                            "type": "items",
                            "id": "52ACDF83-86B6-8A83-76F7-EF7AD9BB3715"
                        },
                        {
                            "type": "items",
                            "id": "4544D65D-9204-2AC0-F1AC-70F8594FBFBE"
                        },
                        {
                            "type": "items",
                            "id": "EE4DE682-2375-01A0-5EC0-0377714D366D"
                        },
                        {
                            "type": "items",
                            "id": "E0B5FE8C-A5FE-52A3-9DD9-A3E3CEFE174E"
                        },
                        {
                            "type": "items",
                            "id": "317C13AD-260D-21E3-7B79-C3704D57CE26"
                        },
                        {
                            "type": "items",
                            "id": "2EB6C8F8-47C3-AC32-3431-49A2EF052C6E"
                        },
                        {
                            "type": "items",
                            "id": "B752D14A-BD22-82EA-3E52-63F99F2B6D3B"
                        },
                        {
                            "type": "items",
                            "id": "CAF0C844-B336-41CD-123E-457EBAD43C5E"
                        },
                        {
                            "type": "items",
                            "id": "94393C15-A7E4-C9F5-1EA2-B9C48D0441EE"
                        },
                        {
                            "type": "items",
                            "id": "1F8809D7-3B24-915E-131C-AFE2176153E6"
                        },
                        {
                            "type": "items",
                            "id": "12E92E2D-1037-AA9F-663A-3D24B9D3BB46"
                        },
                        {
                            "type": "items",
                            "id": "B99AC23B-DC10-37D9-C188-385DCDF33AE6"
                        },
                        {
                            "type": "items",
                            "id": "F35EE7C1-543D-0EE4-55A9-4881A2506165"
                        }
                    ]
                },
                "sections": {
                    "data": []
                }
            }
        },
        {
            "type": "modules",
            "id": "edps0045",
            "attributes": {
                "node_type": "Module",
                "title": "EDPS0045: Debates in the History of Education",
                "code": "EDPS0045",
                "description": null
            }
        },
        {
            "type": "users",
            "id": "rn5LPuxDUJ00yE75imyUSw",
            "attributes": {
                "first_name": "Tom",
                "surname": "Woodin",
                "email": "t.woodin@ucl.ac.uk",
                "additional_emails": [],
                "job_role_description": "academic",
                "is_profile_private": false,
                "date_bookmark_extension_alert_dismissed": null
            },
            "meta": {
                "profile_url": "http://readinglists.ucl.ac.uk/users/11B60B85-84C4-C7BF-3D3F-E55E4B9E1A00"
            }
        }
    ]
}

// =========
// API CREDENTIALS
// =========

// The API requires authentication via `Bearer <token>` header.
// You can get all API info from the `window.shipshape` object, including the token, endpoint, and other details.

// {
//   "config": {
//       "apiEndpoint": "https://rl.talis.com/3",
//       "isEmbeddedMode": false,
//       "personaEndpoint": "https://users.talis.com/2",
//       "personaOrigin": "https://users.talis.com",
//       "oauthAppId": "rl",
//       "talisLoginProvider": "tfsadmin",
//       "bookmarkingExtensionUrl": "https://support.talis.com/hc/en-gb/articles/17338752211485",
//       "tenant": {
//           "anonymousAccessToken": "eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiIsImtpZCI6InByb2R1Y3Rpb24tandrIn0.eyJqdGkiOiJkNTk4ZDJkOTZmMmYxMWMzYzliYjcwNjQwYjZkNDAxYjkyNDlkZTBhIiwiaWF0IjoxNzY3NTAzMzQxLCJleHAiOjE3Njc1MzIxNDEsImF1ZCI6IlZ0STYwbzlQIiwic3ViIjoiVnRJNjBvOVAiLCJzY29wZXMiOlsiVnRJNjBvOVAiXX0.HKrmKrSfmNDJwT-VA6E6l9DzfRP9jwC6VUR-daJv_J7Hb_s-qpuEchfUb97VDvkEkbBohCB-g3p2ufsFOZSf_sFUvhkMCQ5pLUt-ZSrgAiwzjhZD_vSTGA3FordUa-zFh2K-8mgapSDpbrI-Sm93RJkEKYrlHmVrMri7qq_LRpyh4EvsiNJVqj3DSuXmolTY4i8yeDoj5hSa_rqaOXhd7Rm0VcuBIpc4gYkCGse9OMjJ7gJxexAHGjQJ6sBIZ_6wp-EMK2--nJgOp2UB2PULgckU1A_brwFN1_hNXWnb1EmT7vdtejoe58Ou6X6V9Isq7uyG0i_aVm4OEKpkL4gvHw",
//           "conceptBaseUri": "http://readinglists.ucl.ac.uk",
//           "featureFlags": {
//               "reviewWorkflow": "review_and_publish",
//               "isDigitisationWorkflowEnabled": false,
//               "isListEditEnabled": true,
//               "isShipshapeTenancyDefault": true,
//               "isReportBrokenLinkEnabled": true,
//               "isMisDashboardEnabled": false,
//               "isAddFromWorksEnabled": true,
//               "isMusicScoresDigitisationEnabled": false,
//               "isBookmarkingExtensionBannerEnabled": false,
//               "discoverySystemId": null,
//               "isAutofillProfileEnabled": false,
//               "isCourseReserveWorkflowEnabled": false,
//               "isCourseFlowTenancy": false,
//               "isTalisReaderWorkflowEnabled": false,
//               "fileUploadToReadingListCustomerTier": "getintouch",
//               "isProductFruitsEnabled": true,
//               "requiredItemImportances": "off",
//               "isUnstableResourceTypesEnabled": false
//           },
//           "library": {
//               "hideDoiLinks": false,
//               "isOpenUrlLinkingEnabled": true
//           },
//           "hierarchy": {
//               "isHierarchyUpdateEnabled": true
//           },
//           "discoverySystems": [
//               {
//                   "id": "523137dd-ed0e-4292-a805-67f527f15356",
//                   "type": "primo",
//                   "base_url": "https://rl.talis.com/discovery/1/ucl/primo/523137dd-ed0e-4292-a805-67f527f15356/search",
//                   "catalogue_source_id": null
//               }
//           ],
//           "httpsBaseUri": "https://ucl.rl.talis.com",
//           "loginProvider": "ucl",
//           "name": "University College London",
//           "roleMapping": {
//               "listcreator": [
//                   "create-list"
//               ],
//               "roleadmin": [
//                   "grant-any-role"
//               ],
//               "listpub": [
//                   "archive-list",
//                   "assign-license",
//                   "create-list",
//                   "edit-list",
//                   "grant-this-role",
//                   "publish-list",
//                   "request-review",
//                   "delete-list"
//               ],
//               "nodeeditor": [
//                   "attach-list-to-node",
//                   "edit-node",
//                   "grant-this-role"
//               ],
//               "libraryacquisitions": [
//                   "receive-new-review-requests-by-email",
//                   "view-acquisitions"
//               ],
//               "admin": [
//                   "archive-list",
//                   "assign-license",
//                   "create-list",
//                   "edit-list",
//                   "grant-any-role",
//                   "grant-this-role",
//                   "list-access-control",
//                   "publish-list",
//                   "receive-new-review-requests-by-email",
//                   "request-review",
//                   "view-acquisitions",
//                   "idp-migration",
//                   "request-rollover",
//                   "upload-hierarchy",
//                   "home-message",
//                   "resource-metadata-refresh",
//                   "view-reports",
//                   "delete-list",
//                   "access-keys",
//                   "attach-list-to-node",
//                   "perform-bulk-actions",
//                   "v2-configure-list-beta",
//                   "administer-settings"
//               ],
//               "v2listview": [
//                   "v2-list-view"
//               ],
//               "copyright": [],
//               "tdc:app:access": [],
//               "v2listadmin": [
//                   "v2-configure-list-beta",
//                   "v2-list-view"
//               ],
//               "v2listedit": [
//                   "v2-list-edit"
//               ],
//               "listanalytics": [],
//               "v2bookmarkingbeta": [
//                   "access-v2-bookmarking"
//               ]
//           },
//           "roleCodesByRoleId": {
//               "list-creator": "listcreator",
//               "list-publisher": "listpub",
//               "list-analytics-beta": "listanalytics",
//               "node-editor": "nodeeditor",
//               "administrator": "admin",
//               "role-administrator": "roleadmin",
//               "university-administrator": "universityadministrator",
//               "v2-list": "v2listview",
//               "v2-list-edit": "v2listedit",
//               "v2-list-admin": "v2listadmin",
//               "manage-player-resources": "tdc:app:access",
//               "copyright-clearance-pilot": "copyright",
//               "library-acquisitions": "libraryacquisitions",
//               "v2-bookmarking-beta": "v2bookmarkingbeta",
//               "tagging-beta": "taggingbeta"
//           },
//           "shortCode": "ucl",
//           "v2DashboardEnabled": true,
//           "reviewsUrl": "https://listreviews.talis.com/ucl/reviews",
//           "elevateApiUrl": "https://app.talis.com/1"
//       },
//       "session": {
//           "isAnLti1p0EmbeddedSession": false,
//           "lti1p3LaunchId": null
//       }
//   }
// }

*/