import { readFile } from "node:fs/promises";

import { defineConfig } from "zotero-plugin-scaffold";
import type { Plugin } from "esbuild";

import pkg from "./package.json";

// ---------------------------------------------------------------------------
// zotero-plugin-toolkit Zotero 8/9 compatibility patch
//
// The toolkit (through at least 5.1.0-beta.13) feature-detects the legacy JSM
// loader with `typeof ChromeUtils.import === "undefined"`. On Zotero 8+
// (Firefox 140) ChromeUtils.import still *exists* but only throws
// "ChromeUtils.import() has been removed. Use importESModule()", so the
// toolkit rewrites every *.sys.mjs path back to *.jsm and the import fails.
//
// Patch the bundled copy to try importESModule first (available since
// Firefox 106, so on every supported Zotero) and keep the legacy loader as
// the fallback. The build fails loudly if the toolkit source stops matching.
// ---------------------------------------------------------------------------

const TOOLKIT_LEGACY_IMPORT = [
  "function _importESModule(path) {",
  '\tif (typeof ChromeUtils.import === "undefined") return ChromeUtils.importESModule(path, { global: "contextual" });',
  '\tif (path.endsWith(".sys.mjs")) path = path.replace(/\\.sys\\.mjs$/, ".jsm");',
  "\treturn ChromeUtils.import(path);",
  "}",
].join("\n");

const TOOLKIT_PATCHED_IMPORT = [
  "function _importESModule(path) {",
  '\tif (typeof ChromeUtils.importESModule !== "undefined") {',
  "\t\ttry {",
  '\t\t\treturn ChromeUtils.importESModule(path, { global: "contextual" });',
  "\t\t} catch {",
  "\t\t\t/* fall through to the legacy loader below */",
  "\t\t}",
  "\t}",
  '\tif (path.endsWith(".sys.mjs")) path = path.replace(/\\.sys\\.mjs$/, ".jsm");',
  "\treturn ChromeUtils.import(path);",
  "}",
].join("\n");

const patchToolkitEsmImport: Plugin = {
  name: "patch-toolkit-esm-import",
  setup(build) {
    let patched = false;
    build.onStart(() => {
      patched = false;
    });
    build.onLoad(
      { filter: /[\\/]zotero-plugin-toolkit[\\/]dist[\\/]index\.js$/ },
      async (args) => {
        const source = await readFile(args.path, "utf8");
        if (!source.includes(TOOLKIT_LEGACY_IMPORT)) {
          throw new Error(
            "zotero-plugin-toolkit's _importESModule no longer matches the " +
              "Zotero 8/9 compatibility patch in zotero-plugin.config.ts. If " +
              "the toolkit fixed its ChromeUtils.import feature detection " +
              "upstream, delete the patch; otherwise update " +
              `TOOLKIT_LEGACY_IMPORT to the new source. (${args.path})`,
          );
        }
        patched = true;
        return {
          contents: source.replace(TOOLKIT_LEGACY_IMPORT, TOOLKIT_PATCHED_IMPORT),
          loader: "js",
        };
      },
    );
    build.onEnd(() => {
      if (!patched) {
        throw new Error(
          "patch-toolkit-esm-import did not run — zotero-plugin-toolkit's " +
            "dist layout changed. Update the onLoad filter in " +
            "zotero-plugin.config.ts or delete the patch if the toolkit " +
            "fixed its ChromeUtils.import feature detection upstream.",
        );
      }
    });
  },
};

export default defineConfig({
  source: ["src", "addon"],
  dist: ".scaffold/build",
  name: pkg.config.addonName,
  id: pkg.config.addonID,
  namespace: pkg.config.addonRef,
  updateURL: `https://github.com/{{owner}}/{{repo}}/releases/download/release/${
    pkg.version.includes("-") ? "update-beta.json" : "update.json"
  }`,
  xpiDownloadLink:
    "https://github.com/{{owner}}/{{repo}}/releases/download/v{{version}}/{{xpiName}}.xpi",

  build: {
    assets: ["addon/**/*.*"],
    define: {
      ...pkg.config,
      author: pkg.author,
      description: pkg.description,
      homepage: pkg.homepage,
      buildVersion: pkg.version,
      buildTime: "{{buildTime}}",
    },
    prefs: {
      prefix: pkg.config.prefsPrefix,
    },
    esbuildOptions: [
      {
        entryPoints: ["src/index.ts"],
        define: {
          __env__: `"${process.env.NODE_ENV}"`,
        },
        bundle: true,
        // Keep firefox115 so the bundle still runs on Zotero 7; Zotero 8/9
        // (Firefox 140) are a superset for the syntax we emit.
        target: "firefox115",
        outfile: `.scaffold/build/addon/content/scripts/${pkg.config.addonRef}.js`,
        jsx: "transform",
        jsxFactory: "h",
        jsxFragment: "Fragment",
        plugins: [patchToolkitEsmImport],
      },
    ],
  },

  test: {
    waitForPlugin: `() => Zotero.${pkg.config.addonInstance}.data.initialized`,
  },

  // If you need to see a more detailed log, uncomment the following line:
  // logLevel: "trace",
});
