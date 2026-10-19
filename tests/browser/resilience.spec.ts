import { test, expect } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { resolve, extname } from "node:path";
test("denied storage still permits session-only play", async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, "indexedDB", {
      get() {
        throw new Error("Storage denied");
      },
    });
  });
  await page.goto("/");
  await expect(page.locator("#toast")).toContainText("Storage unavailable");
  await page.locator('[data-mode="practice"]').click();
  await page.locator("#start-button").click();
  await expect(page.locator("#board")).toHaveAttribute("aria-busy", "false");
  await page.locator("#board").press("Space");
  await expect(page.locator("#score")).not.toHaveText("000000");
});
test("keyboard remapping preserves menu focus and browser navigation", async ({
  page,
}) => {
  await page.goto("/");
  await page.locator('[data-mode="practice"]').click();
  await page.locator("#start-button").click();
  await page.locator("#settings-button").click();
  await page.locator('[data-bind="drop"]').click();
  await page.keyboard.press("KeyB");
  await expect(page.locator('[data-bind="drop"] kbd')).toHaveText("B");
  await page.locator("#close-modal").click();
  await expect(page.locator("#board")).toHaveAttribute("aria-busy", "false");
  await page.locator("#board").press("KeyB");
  await expect(page.locator("#score")).not.toHaveText("000000");
  await page.locator("#settings-button").focus();
  await page.keyboard.press("Space");
  await expect(page.locator("#modal")).toBeVisible();
});
test("context interruption pauses instead of silently losing the run", async ({
  page,
}) => {
  await page.goto("/");
  await page.locator("#start-button").click();
  await page
    .locator("#board canvas")
    .evaluate((canvas) =>
      canvas.dispatchEvent(new Event("webglcontextlost", { cancelable: true })),
    );
  await expect(page.locator("#modal")).toBeVisible();
  await expect(page.locator("#toast")).toContainText(
    "Graphics were interrupted",
  );
});
test("backup export and import restores run and validates broken files", async ({
  page,
}) => {
  await page.goto("/");
  await page.locator('[data-mode="practice"]').click();
  await page.locator("#start-button").click();
  await expect(page.locator("#board")).toHaveAttribute("aria-busy", "false");
  await page.locator("#board").press("Space");
  await expect(page.locator("#score")).not.toHaveText("000000");
  const score = await page.locator("#score").innerText();
  await page.locator("#settings-button").click();
  const downloadPromise = page.waitForEvent("download");
  await page.locator("#export-backup").click();
  const download = await downloadPromise;
  const path = (await download.path())!;
  await page.locator("#import-file").setInputFiles({
    name: "broken.json",
    mimeType: "application/json",
    buffer: Buffer.from('{"format":"bad"}'),
  });
  await expect(page.locator("#toast")).toContainText("version 1 Frac backup");
  await page.locator("#import-file").setInputFiles(path);
  await expect(page.locator("#confirm-import")).toBeVisible();
  await page.locator("#confirm-import").click();
  await expect(page.locator("#continue-button")).toBeVisible();
  await page.locator("#continue-button").click();
  await page.locator("#resume").click();
  await expect(page.locator("#score")).toHaveText(score);
});
test("simultaneous touch movement and soft drop cancel cleanly", async ({
  page,
  browserName,
}) => {
  test.skip(browserName !== "chromium");
  await page.goto("/");
  await page.locator('[data-mode="practice"]').click();
  await page.locator("#start-button").click();
  await page.locator("#settings-button").click();
  await page.locator('[data-setting="controls"]').check();
  await page.locator("#close-modal").click();
  await expect(page.locator("#board")).toHaveAttribute("aria-busy", "false");
  const move = (await page
      .locator('.dpad [data-action="left"]')
      .boundingBox())!,
    soft = (await page
      .locator('.drop-cluster [data-action="soft"]')
      .boundingBox())!;
  const session = await page.context().newCDPSession(page);
  await session.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [
      { x: move.x + move.width / 2, y: move.y + move.height / 2, id: 1 },
      { x: soft.x + soft.width / 2, y: soft.y + soft.height / 2, id: 2 },
    ],
  });
  await expect(page.locator('.drop-cluster [data-action="soft"]')).toHaveClass(
    /pressed/,
  );
  await session.send("Input.dispatchTouchEvent", {
    type: "touchCancel",
    touchPoints: [],
  });
  await expect(page.locator(".pressed")).toHaveCount(0);
});
test("production assets work beneath a subpath inside an iframe", async ({
  page,
}) => {
  const root = resolve("dist");
  const mime: Record<string, string> = {
    ".html": "text/html",
    ".js": "application/javascript",
    ".css": "text/css",
    ".svg": "image/svg+xml",
    ".txt": "text/plain",
  };
  const failures: string[] = [];
  page.on("pageerror", (e) => failures.push(e.message));
  await page.route("**/distribution-test/**", async (route) => {
    const url = new URL(route.request().url());
    if (url.pathname.endsWith("/host.html"))
      return route.fulfill({
        contentType: "text/html",
        body: '<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0"><iframe title="Game embed" src="./index.html" style="width:100%;height:700px;border:0"></iframe></body></html>',
      });
    const path = resolve(
      root,
      decodeURIComponent(
        url.pathname.split("/distribution-test/")[1] || "index.html",
      ),
    );
    if (!path.startsWith(root + "/")) return route.fulfill({ status: 403 });
    try {
      await route.fulfill({
        body: await readFile(path),
        contentType: mime[extname(path)] || "application/octet-stream",
      });
    } catch {
      await route.fulfill({ status: 404 });
    }
  });
  await page.goto("/distribution-test/host.html");
  const frame = page.frameLocator("iframe");
  await expect(frame.locator("#board canvas")).toBeVisible();
  await frame.locator('[data-mode="practice"]').click();
  await frame.locator("#start-button").click();
  await expect(frame.locator("#board")).toHaveAttribute("aria-busy", "false");
  await frame.locator("#board").press("Space");
  await expect(frame.locator("#score")).not.toHaveText("000000");
  expect(failures).toEqual([]);
});
