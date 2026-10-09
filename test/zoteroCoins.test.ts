import { assert } from "chai";
import { buildShareIndexHtml } from "../src/utils/buildShareIndexHtml";
import { coinsHiddenBlock, extractCoinsSpans } from "../src/utils/zoteroCoins";

describe("zoteroCoins", function () {
  const sampleBib = `
    <div class="csl-bib-body">
      <div class="csl-entry">One
        <span class="Z3988" title="url_ver=Z39.88-2004&amp;rft.title=One"></span>
      </div>
      <div class="csl-entry">Two
        <span class="Z3988" title="url_ver=Z39.88-2004&amp;rft.title=Two"></span>
      </div>
    </div>`;

  it("extracts COinS spans from bibliography HTML", function () {
    const coins = extractCoinsSpans(sampleBib);
    assert.include(coins, 'class="Z3988"');
    assert.include(coins, "rft.title=One");
    assert.include(coins, "rft.title=Two");
    assert.equal((coins.match(/Z3988/g) || []).length, 2);
  });

  it("embeds COinS in the static share index shell", function () {
    const html = buildShareIndexHtml({
      title: "People workers",
      canonicalUrl: "https://example.test/u/1/1/KEY/",
      bibliographyHtml: sampleBib,
    });
    assert.include(html, 'id="zotero-coins"');
    assert.include(html, 'class="Z3988"');
    assert.include(html, "rft.title=One");
    assert.include(html, 'id="root"');
    assert.include(coinsHiddenBlock(extractCoinsSpans(sampleBib)), "hidden");
  });
});
