import { assert } from "chai";
import { isPrintableItemHref } from "../src/utils/printSyllabus";
import { runsFromNode } from "../src/utils/exportSyllabus";
import { publishFileIconKind } from "../src/utils/zoteroAttachmentIcons";
import { remoteMatchesLocal } from "../src/utils/publishFileFingerprints";

describe("publish link hrefs", function () {
  it("accepts http(s) and relative files/ paths", function () {
    assert.isTrue(isPrintableItemHref("https://example.edu/a"));
    assert.isTrue(isPrintableItemHref("http://example.edu/a"));
    assert.isTrue(isPrintableItemHref("files/ABCD1234.pdf"));
    assert.isTrue(isPrintableItemHref("files/KEY.epub"));
    assert.isFalse(isPrintableItemHref(""));
    assert.isFalse(isPrintableItemHref("files/../etc/passwd"));
    assert.isFalse(isPrintableItemHref("file:///tmp/x.pdf"));
    assert.isFalse(isPrintableItemHref("/files/ABCD.pdf"));
  });

  it("maps uploaded files/ paths to PDF/EPUB icon kinds", function () {
    assert.equal(publishFileIconKind("files/ABCD1234.pdf"), "pdf");
    assert.equal(publishFileIconKind("files/KEY.epub"), "epub");
    assert.isNull(publishFileIconKind("files/KEY.png"));
    assert.isNull(publishFileIconKind("https://example.edu/a.pdf"));
    assert.isNull(publishFileIconKind("files/../x.pdf"));
  });

  it("matches R2 metadata to local fingerprints", function () {
    assert.isTrue(
      remoteMatchesLocal({
        exists: true,
        remoteSize: 100,
        remoteFingerprint: "100:1",
        localFingerprint: "100:1",
      }),
    );
    assert.isFalse(
      remoteMatchesLocal({
        exists: true,
        remoteSize: 100,
        remoteFingerprint: "100:1",
        localFingerprint: "100:2",
      }),
    );
    assert.isTrue(
      remoteMatchesLocal({
        exists: true,
        remoteSize: 100,
        remoteFingerprint: null,
        localFingerprint: "100:9",
      }),
    );
    assert.isFalse(
      remoteMatchesLocal({
        exists: false,
        remoteSize: 0,
        remoteFingerprint: null,
        localFingerprint: "100:1",
      }),
    );
  });

  it("keeps relative files/ links in export runs", function () {
    const root = new DOMParser().parseFromString(
      `<div><a href="files/ABCD1234.pdf">Paper</a></div>`,
      "text/html",
    ).body.firstChild as Node;
    const runs = runsFromNode(root);
    assert.deepEqual(runs, [
      { type: "link", text: "Paper", href: "files/ABCD1234.pdf" },
    ]);
  });
});
