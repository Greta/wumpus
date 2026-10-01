import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
const manifest = JSON.parse(
  readFileSync(new URL("./classic-manifest.json", import.meta.url), "utf8"),
);
for (const [path, expected] of Object.entries(manifest)) {
  const data = readFileSync(
    new URL(`../classic/0.1.0/${path}`, import.meta.url),
  );
  if (createHash("sha256").update(data).digest("hex") !== expected) {
    throw new Error(`Original 0.1.0 file changed: ${path}`);
  }
}
console.log(
  `Verified ${Object.keys(manifest).length} original 0.1.0 files, byte for byte.`,
);
