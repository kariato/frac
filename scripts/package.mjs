// SPDX-License-Identifier: GPL-3.0-only
import { mkdir, readFile, writeFile, copyFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
const { version } = JSON.parse(
  await readFile(new URL("../package.json", import.meta.url), "utf8"),
);
await mkdir("release", { recursive: true });
let commit = "development";
try {
  commit = execFileSync("git", ["rev-parse", "HEAD"], {
    stdio: ["ignore", "pipe", "ignore"],
  })
    .toString()
    .trim();
} catch {
  /* Source archive is unavailable without a repository. */
}
await copyFile("LICENSE", "dist/LICENSE.txt");
await copyFile("THIRD_PARTY_NOTICES.md", "dist/THIRD_PARTY_NOTICES.md");
await writeFile(
  "dist/SOURCE.txt",
  `FRAC ${version}\nGPL-3.0-only\nCommit: ${commit}\nSource: https://github.com/kariato/frac\nBuild: npm ci && npm run build\n`,
);
await writeFile(
  "dist/build.json",
  JSON.stringify({ version, commit }, null, 2),
);
const zip = `frac-${version}-html5.zip`;
// Remove only our generated archive so a repeated package command cannot retain obsolete files.
const { rm } = await import("node:fs/promises");
await rm(`release/${zip}`, { force: true });
execFileSync("zip", ["-qr", `../release/${zip}`, "."], { cwd: "dist" });
if (commit !== "development") {
  execFileSync("git", [
    "archive",
    "--format=zip",
    `--prefix=frac-${version}/`,
    "-o",
    `release/frac-${version}-source.zip`,
    "HEAD",
  ]);
}
console.log(`Packaged release/${zip} (${commit}).`);
