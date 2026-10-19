import { defineConfig } from "vite";
import { execFileSync } from "node:child_process";
let commit = "development";
try {
  commit = execFileSync("git", ["rev-parse", "--short", "HEAD"], {
    stdio: ["ignore", "pipe", "ignore"],
  })
    .toString()
    .trim();
} catch {
  /* Uncommitted source checkout. */
}
export default defineConfig({
  base: "./",
  define: { __BUILD_COMMIT__: JSON.stringify(commit) },
  build: {
    target: "es2022",
    rolldownOptions: {
      output: {
        manualChunks: (id) =>
          id.includes("node_modules/three/") ? "three" : undefined,
      },
    },
  },
});
