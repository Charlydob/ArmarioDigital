import { spawn } from "node:child_process";
import { rmSync } from "node:fs";
function cleanup() {
  rmSync("src/app/mobile-test-fixture", { recursive: true, force: true });
  rmSync(".next/dev/types", { recursive: true, force: true });
}
process.on("exit", cleanup);
process.on("SIGTERM", () => { cleanup(); process.exit(143); });
process.on("SIGINT", () => { cleanup(); process.exit(130); });
const child = spawn(process.execPath, ["node_modules/@playwright/test/cli.js", "test", ...process.argv.slice(2)], { stdio: "inherit" });
const code = await new Promise(resolve => child.on("exit", resolve));
cleanup();
process.exit(typeof code === "number" ? code : 1);
