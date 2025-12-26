import { execSync } from "child_process";
import { createHash } from "crypto";
import { readFileSync, writeFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, "..");

const inputFile = join(rootDir, "src/tailwind.css");
const outputFile = join(rootDir, "addon/content/tailwind.css");
const hashFile = join(rootDir, "addon/content/tailwind-hash.json");

try {
  execSync(
    `npx @tailwindcss/cli -i ${inputFile} -o ${outputFile}`,
    { stdio: "inherit", cwd: rootDir }
  );

  // Compute hash of the generated CSS file
  const cssContent = readFileSync(outputFile, "utf8");
  const hash = createHash("sha256").update(cssContent).digest("hex").substring(0, 8);

  // Write hash to JSON file
  writeFileSync(hashFile, JSON.stringify({ hash, version: hash }), "utf8");

  console.log(`✓ Built Tailwind CSS: ${outputFile}`);
  console.log(`✓ CSS hash: ${hash}`);
} catch (err) {
  console.error("Error building CSS:", err);
  process.exit(1);
}

