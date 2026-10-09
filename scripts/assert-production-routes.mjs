import { access, readFile } from "node:fs/promises";
const fixtures = ["src/app/mobile-test-fixture", "src/app/__mobile_test"];
for (const path of fixtures) {
  if (await access(path).then(() => true, () => false)) throw new Error(`Remove the temporary test route before building: ${path}`);
}
if (process.argv.includes("--built")) {
  const manifest = await readFile(".next/server/app-paths-manifest.json", "utf8");
  if (/mobile-test-fixture|__mobile_test/.test(manifest)) throw new Error("Production manifest contains a test route");
}
