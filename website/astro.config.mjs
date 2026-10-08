// @ts-check
import { defineConfig } from "astro/config";
import starlight from "@astrojs/starlight";

// https://astro.build/config
export default defineConfig({
  site: "https://janbaykara.github.io",
  base: "/zotero-syllabus",
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
          href: "https://www.reddit.com/r/zotero/comments/1puxigg/zotero_syllabus_a_plugin_for_managing_your_uni/",
        },
      ],
      editLink: {
        baseUrl:
          "https://github.com/janbaykara/zotero-syllabus/edit/main/website/",
      },
      customCss: ["./src/styles/custom.css"],
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
            { label: "Community", slug: "reference/community" },
            { label: "Troubleshooting", slug: "reference/troubleshooting" },
            { label: "For developers", slug: "developers" },
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
      ],
    }),
  ],
});
