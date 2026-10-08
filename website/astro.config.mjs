// @ts-check
import { defineConfig } from "astro/config";
import starlight from "@astrojs/starlight";
import starlightTypeDoc from "starlight-typedoc";

const base = "/zotero-syllabus";

// https://astro.build/config
export default defineConfig({
  site: "https://janbaykara.github.io",
  base,
  // Avoid /zotero-syllabus (no slash) resolving ./getting-started/ → /getting-started/
  trailingSlash: "always",
  integrations: [
    starlight({
      title: "Zotero Syllabus",
      description:
        "Turn Zotero collections into syllabi and course reading lists you can study from.",
      logo: {
        src: "./src/assets/logo.png",
        alt: "Zotero Syllabus",
        replacesTitle: false,
      },
      // Brand mark (same as plugin icon); not the Astro default SVG.
      favicon: "/favicon.png",
      social: [
        {
          icon: "github",
          label: "GitHub",
          href: "https://github.com/janbaykara/zotero-syllabus",
        },
        {
          icon: "discord",
          label: "Discord",
          href: "https://discord.gg/PtEY5DxCea",
        },
        {
          icon: "reddit",
          label: "Reddit",
          href: "https://www.reddit.com/r/zotero/comments/1w3eu97/zotero_syllabus_a_plugin_for_students_to_organise/",
        },
      ],
      editLink: {
        baseUrl:
          "https://github.com/janbaykara/zotero-syllabus/edit/main/website/",
      },
      customCss: ["./src/styles/custom.css"],
      components: {
        Header: "./src/components/Header.astro",
      },
      plugins: [
        starlightTypeDoc({
          entryPoints: ["../src/api.ts"],
          tsconfig: "../tsconfig.json",
          output: "api",
          // Avoid next/prev hopping through generated interface pages.
          pagination: false,
          // Never enable watch here — it hangs `astro build` in TypeDoc watch mode.
          watch: false,
          typeDoc: {
            name: "Zotero.Syllabus.api",
            // Intro lives on the syllabusApi JSDoc (single Reference → API page).
            readme: "none",
            plugin: ["./typedoc-api-page-title.mjs"],
            excludePrivate: true,
            excludeInternal: true,
            excludeExternals: true,
            githubPages: false,
            hideGenerator: true,
            // Parent plugin sources have unrelated TS noise; document api.ts only.
            skipErrorChecking: true,
            treatWarningsAsErrors: false,
            validation: {
              notExported: false,
              invalidLink: false,
              notDocumented: false,
            },
            // Prefer readable JSDoc sections over one giant expanded type dump.
            expandObjects: false,
            expandParameters: false,
            useCodeBlocks: true,
            parametersFormat: "list",
            // list = heading + JSDoc per member (not a giant type table)
            typeDeclarationFormat: "list",
            propertyMembersFormat: "list",
            interfacePropertiesFormat: "list",
            classPropertiesFormat: "list",
            typeAliasPropertiesFormat: "list",
            tableColumnSettings: {
              hideDefaults: true,
              hideSources: true,
              hideModifiers: true,
              hideInherited: true,
              hideOverrides: true,
            },
            sort: ["source-order"],
            categorizeByGroup: false,
          },
        }),
      ],
      sidebar: [
        {
          label: "Start here",
          items: [
            { label: "Getting started", slug: "getting-started" },
            {
              label: "Tutorials",
              items: [
                {
                  label: "Student: your first week",
                  slug: "tutorials/student",
                },
                {
                  label: "Educator: build a course",
                  slug: "tutorials/educator",
                },
                {
                  label: "Researcher: shelves and feed",
                  slug: "tutorials/researcher",
                },
              ],
            },
          ],
        },
        {
          label: "How-to guides",
          items: [
            { label: "Syllabus", slug: "how-to/syllabus" },
            { label: "Reading Schedule", slug: "how-to/reading-schedule" },
            { label: "Gallery", slug: "how-to/gallery" },
            { label: "Home", slug: "how-to/home" },
            { label: "Annotation Feed", slug: "how-to/annotation-feed" },
            { label: "Pinning", slug: "how-to/pinning" },
            {
              label: "Import a reading list",
              slug: "how-to/import-reading-lists",
            },
            {
              label: "Print, export, and publish",
              slug: "how-to/print-export-publish",
            },
            { label: "Preferences", slug: "how-to/preferences" },
          ],
        },
        {
          label: "Concepts",
          items: [
            {
              label: "What is a syllabus?",
              slug: "concepts/what-is-a-syllabus",
            },
            { label: "Class notes", slug: "concepts/class-notes" },
            {
              label: "Pinning vs Course Information",
              slug: "concepts/pinning-vs-course-info",
            },
            {
              label: "Personal reading order",
              slug: "concepts/personal-reading-order",
            },
            {
              label: "Auto-managed folders",
              slug: "concepts/auto-managed-folders",
            },
          ],
        },
        {
          label: "Reference",
          items: [
            {
              label: "Import platforms",
              slug: "reference/import-platforms",
            },
            {
              label: "Preferences checklist",
              slug: "reference/preferences-checklist",
            },
            { label: "Troubleshooting", slug: "reference/troubleshooting" },
            // Generated method reference (intro + syllabusApi); interface pages stay off-nav.
            {
              label: "API",
              link: "api/variables/syllabusapi/",
            },
            { label: "For developers", slug: "developers" },
            {
              label: "Supporting Gaza’s academic reconstruction",
              slug: "support-gaza",
            },
          ],
        },
      ],
      head: [
        {
          tag: "meta",
          attrs: {
            name: "theme-color",
            content: "#cc2936",
          },
        },
        {
          tag: "link",
          attrs: {
            rel: "icon",
            href: `${base}/favicon.ico`,
            sizes: "32x32",
          },
        },
        {
          tag: "link",
          attrs: {
            rel: "apple-touch-icon",
            href: `${base}/favicon.png`,
          },
        },
      ],
    }),
  ],
});
