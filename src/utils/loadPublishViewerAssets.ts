/** Read built publish-viewer JS/CSS from the addon chrome package. */

import { config } from "../../package.json";

async function readChromeText(chromePath: string): Promise<string> {
  const url = `chrome://${config.addonRef}/${chromePath}`;
  try {
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }
    return await res.text();
  } catch (err) {
    ztoolkit.log("loadPublishViewerAssets fetch failed:", url, err);
    // Fallback: XMLHttpRequest (older chrome paths)
    return await new Promise((resolve, reject) => {
      try {
        const xhr = new XMLHttpRequest();
        xhr.open("GET", url, true);
        xhr.overrideMimeType("text/plain");
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve(xhr.responseText || "");
          } else {
            reject(new Error(`XHR ${xhr.status}`));
          }
        };
        xhr.onerror = () => reject(new Error("XHR error"));
        xhr.send(null);
      } catch (e) {
        reject(e);
      }
    });
  }
}

/** galleryCover.css + share-viewer shim (item share + collection viewer). */
export async function loadShareCoverCss(): Promise<string> {
  const [galleryCoverCss, coverShimCss] = await Promise.all([
    // Same source as in-app Gallery covers — avoid a diverging fork.
    readChromeText("content/galleryCover.css"),
    readChromeText("content/share-viewer-cover-shim.css"),
  ]);
  return [galleryCoverCss, coverShimCss]
    .filter((chunk) => chunk && chunk.trim())
    .join("\n\n");
}

export async function loadPublishViewerAssets(): Promise<{
  js: string;
  css: string;
}> {
  const [js, viewerCss, coverCss] = await Promise.all([
    readChromeText("content/scripts/publish-viewer.js"),
    readChromeText("content/publish-viewer.css"),
    loadShareCoverCss(),
  ]);
  if (!js.trim()) {
    throw new Error("publish_viewer_missing");
  }
  const css = [coverCss, viewerCss]
    .filter((chunk) => chunk && chunk.trim())
    .join("\n\n");
  return { js, css };
}
