// Temporary fixture route; never part of the production build or deployment.
import { mkdir, copyFile, rm, writeFile } from "node:fs/promises";
import { spawn } from "node:child_process";
const directory = "src/app/mobile-test-fixture";
await mkdir(directory, { recursive: true });
await copyFile("tests/mobile/fixture.tsx", `${directory}/Fixture.tsx`);
await writeFile(`${directory}/page.tsx`, '"use client";\nimport dynamic from "next/dynamic";\nconst Fixture = dynamic(() => import("./Fixture"), { ssr: false });\nexport default function TestPage() { return <Fixture/>; }\n');
const child = spawn(process.execPath, ["node_modules/next/dist/bin/next", "dev", "--webpack", "-p", "3112", "-H", "127.0.0.1"], { stdio: "inherit" });
let stopping = false;
async function stop() { if (stopping) return; stopping = true; child.kill("SIGTERM"); await rm(directory, { recursive: true, force: true }); }
process.on("SIGTERM", stop); process.on("SIGINT", stop);
child.on("exit", async code => { await rm(directory, { recursive: true, force: true }); await rm(".next/dev/types", { recursive: true, force: true }); process.exit(code || 0); });
