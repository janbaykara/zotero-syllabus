import postcss from "postcss";
import tailwindcss from "@tailwindcss/postcss";
import { readFileSync, writeFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, "..");

const inputFile = join(rootDir, "src/tailwind.css");
const outputFile = join(rootDir, "addon/content/tailwind.css");

const css = readFileSync(inputFile, "utf8");

postcss([tailwindcss])
  .process(css, { from: inputFile, to: outputFile })
  .then((result) => {
    writeFileSync(outputFile, result.css);
    console.log(`✓ Built Tailwind CSS: ${outputFile}`);
  })
  .catch((err) => {
    console.error("Error building CSS:", err);
    process.exit(1);
  });

