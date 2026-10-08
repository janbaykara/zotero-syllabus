/**
 * Post-process starlight-typedoc output:
 * - Title the public page "Zotero.Syllabus.api" (export name stays syllabusApi)
 * - Drop the generated project README (we link one curated Reference → API page)
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { RendererEvent } from "typedoc";

const apiDir = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "src/content/docs/api",
);
const pagePath = path.join(apiDir, "variables/syllabusApi.md");
const readmePath = path.join(apiDir, "README.md");

/** @param {import('typedoc').Application} app */
export function load(app) {
  app.renderer.on(RendererEvent.END, () => {
    fs.rmSync(readmePath, { force: true });
    if (!fs.existsSync(pagePath)) return;
    const before = fs.readFileSync(pagePath, "utf8");
    const after = before.replace(
      /^title:\s*"?syllabusApi"?\s*$/m,
      'title: "Zotero.Syllabus.api"',
    );
    if (after !== before) fs.writeFileSync(pagePath, after);
  });
}
