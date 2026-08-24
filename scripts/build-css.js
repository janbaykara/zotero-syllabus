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
  execSync(`npx @tailwindcss/cli -i ${inputFile} -o ${outputFile}`, {
    stdio: "inherit",
    cwd: rootDir,
  });

  execSync(`npx prettier --write "${outputFile}"`, {
    stdio: "inherit",
    cwd: rootDir,
  });

  // Hash the formatted CSS so lint:fix cannot invalidate the cache-buster.
  const cssContent = readFileSync(outputFile, "utf8");
  const hash = createHash("sha256")
    .update(cssContent)
    .digest("hex")
    .substring(0, 8);

  writeFileSync(hashFile, JSON.stringify({ hash, version: hash }), "utf8");
  execSync(`npx prettier --write "${hashFile}"`, {
    stdio: "inherit",
    cwd: rootDir,
  });

  console.log(`✓ Built Tailwind CSS: ${outputFile}`);
  console.log(`✓ CSS hash: ${hash}`);
} catch (err) {
  console.error("Error building CSS:", err);
  process.exit(1);
}
