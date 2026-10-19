import { test, expect, type Page } from "@playwright/test";
import { Engine, type GameConfig } from "../../src/engine";
async function start(page: Page, practice = true) {
  await page.goto("/");
  if (practice) await page.locator('[data-mode="practice"]').click();
  await page.locator("#start-button").click();
  await expect(page.locator(".workspace")).toHaveAttribute(
    "data-screen",
    "game",
  );
  await expect(page.locator("#board")).toHaveAttribute("aria-busy", "false");
}
async function snapshot(page: Page): Promise<any> {
  return page.evaluate(
    () =>
      new Promise((resolve) => {
        const r = indexedDB.open("frac", 1);
        r.onsuccess = () => {
          const req = r.result
            .transaction("data")
            .objectStore("data")
            .get("snapshot");
          req.onsuccess = () => resolve(req.result);
        };
      }),
  );
}
test("home presents six wells and a rendered preview without errors", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Make space. Find your flow." }),
  ).toBeVisible();
  await expect(page.locator("[data-preset]")).toHaveCount(6);
  await expect(page.locator("#board canvas")).toBeVisible();
  await expect(page.locator('#family option[value="standard"]')).toHaveCount(0);
  await expect(page.locator("#family")).toHaveValue("blocks");
  await page.locator('[data-preset="3"]').click();
  await expect(page.locator("#well-size")).toHaveText("8 × 8 × 10");
  await expect(page.locator("#capacity")).toHaveText("640 cubes");
  expect(errors).toEqual([]);
});
test("keyboard drop saves a run, Practice undo restores it, and replay survives reload", async ({
  page,
}) => {
  await start(page);
  await page.locator("#board").press("Space");
  await expect
    .poll(async () => (await snapshot(page))?.state.placements)
    .toBe(1);
  await page.keyboard.press("KeyU");
  await expect
    .poll(async () => (await snapshot(page))?.state.placements)
    .toBe(0);
  await page.keyboard.press("Space");
  await expect
    .poll(async () => (await snapshot(page))?.state.placements)
    .toBe(1);
  await page.reload();
  await expect(page.locator("#continue-button")).toBeVisible();
  await page.locator("#continue-button").click();
  await expect(
    page.getByRole("heading", { name: "A little breathing room." }),
  ).toBeVisible();
  await page.locator("#resume").click();
  await expect(page.locator("#score")).not.toHaveText("000000");
});
test("touch buttons move, rotate, hold and drop without scrolling", async ({
  page,
}) => {
  await start(page);
  await page.locator("#settings-button").click();
  await page.locator('[data-setting="controls"]').check();
  await page.locator("#close-modal").click();
  const before = await snapshot(page);
  const left = page.locator('.dpad [data-action="left"]');
  await left.click();
  await page.locator('.rotation-row [data-action="spinRight"]').click();
  await page.locator('.drop-cluster [data-action="hold"]').click();
  await page.locator('.drop-cluster [data-action="drop"]').click();
  await expect
    .poll(async () => (await snapshot(page))?.state.placements)
    .toBe(1);
  const after = await snapshot(page);
  expect(after.state.held).not.toBeNull();
  expect(after.events.length).toBeGreaterThan(before.events.length);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
test("camera snaps, changes view label, and blocks accidental drops while dragged", async ({
  page,
}) => {
  await start(page);
  await page.locator('[data-action="cameraRight"]').click();
  await expect(page.locator("#view-label")).toHaveText("VIEW 02");
  await expect(page.locator("#board")).toHaveAttribute("aria-busy", "false");
  const bounds = (await page.locator("#board").boundingBox())!;
  await page.mouse.move(
    bounds.x + bounds.width / 2,
    bounds.y + bounds.height / 2,
  );
  await page.mouse.down();
  await page.mouse.move(
    bounds.x + bounds.width / 2 + 70,
    bounds.y + bounds.height / 2 + 5,
  );
  await page.keyboard.press("Space");
  await page.mouse.up();
  await expect(page.locator("#board")).toHaveAttribute("aria-busy", "false");
  await page.keyboard.press("Space");
  await expect
    .poll(async () => (await snapshot(page))?.state.placements)
    .toBe(1);
});
test("custom setup validation prevents bad dimensions and saves named setups", async ({
  page,
}) => {
  await page.goto("/");
  await page.locator("#custom-toggle").click();
  await page.locator("#width").fill("2");
  await expect(page.locator("#start-button")).toBeDisabled();
  await page.locator("#width").fill("7");
  await page.locator("#height").fill("20");
  await page.locator("#save-preset").click();
  await page.locator("#preset-name").fill("Seven wide");
  await page.locator("#confirm-save-preset").click();
  await expect(page.locator("#saved-configs option")).toHaveCount(2);
  await page.locator("#start-button").click();
  await expect(page.locator("#well-size")).toHaveText("7 × 5 × 20");
});
test("interactive tutorial advances from movement through first layer", async ({
  page,
}) => {
  await page.goto("/");
  await page.locator("#how-button").click();
  await page.locator("#help-tour").click();
  await expect(page.locator("#board")).toHaveAttribute("aria-busy", "false");
  await page.locator('.dpad [data-action="right"]').click();
  await page.locator("#tutorial-next").click();
  await page.locator('.rotation-row [data-action="spinRight"]').click();
  await page.locator("#tutorial-next").click();
  await page.locator('[data-action="cameraRight"]').click();
  await page.locator("#tutorial-next").click();
  await expect(page.locator("#board")).toHaveAttribute("aria-busy", "false");
  await page.locator('.drop-cluster [data-action="drop"]').click();
  await expect(page.locator("#layers")).toHaveText("01");
  await page.locator("#tutorial-next").click();
  await expect(page.locator("#tutorial-title")).toHaveText("Leave room below.");
});
test("focus loss pauses and explicit resume clears held input", async ({
  page,
}) => {
  await start(page, false);
  await page.evaluate(() => window.dispatchEvent(new Event("blur")));
  await expect(page.locator("#modal")).toBeVisible();
  const before = await snapshot(page);
  await page.waitForTimeout(300);
  expect((await snapshot(page)).state.tick).toBe(before.state.tick);
  await page.locator("#resume").click();
  await expect(page.locator("#modal")).not.toBeVisible();
});
test("minimum layouts keep all touch controls within viewport", async ({
  page,
}) => {
  for (const size of [
    { width: 360, height: 640 },
    { width: 640, height: 360 },
    { width: 820, height: 1180 },
    { width: 1180, height: 820 },
  ]) {
    await page.setViewportSize(size);
    await start(page);
    await page.locator("#settings-button").click();
    await page.locator('[data-setting="controls"]').check();
    await page.locator("#close-modal").click();
    for (const selector of [
      '.dpad [data-action="left"]',
      '.rotation-row [data-action="tipBack"]',
      '.drop-cluster [data-action="drop"]',
    ]) {
      const box = (await page.locator(selector).boundingBox())!;
      expect(box.width).toBeGreaterThanOrEqual(48);
      expect(box.height).toBeGreaterThanOrEqual(48);
      expect(box.x).toBeGreaterThanOrEqual(0);
      expect(box.y).toBeGreaterThanOrEqual(0);
      expect(box.x + box.width).toBeLessThanOrEqual(size.width);
      expect(box.y + box.height).toBeLessThanOrEqual(size.height);
    }
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: `test-results/layout-${test.info().project.name}-${size.width}.png`,
      fullPage: true,
    });
  }
});

test("large solid previews fit their frames and new runs show doubled speed", async ({
  page,
}) => {
  const config: GameConfig = {
    width: 5,
    depth: 5,
    height: 16,
    family: "blocks",
    mode: "practice",
    seed: 0,
    gravity: false,
    startLevel: 1,
    previews: 3,
    hold: true,
  };
  while (!new Engine(config).state.queue.slice(0, 3).includes(7)) config.seed++;
  await page.goto("/");
  await page.locator("#custom-toggle").click();
  await page.locator("#seed").fill(String(config.seed));
  await page.locator('[data-mode="practice"]').click();
  await page.locator("#start-button").click();
  await expect(page.locator("#stage-label")).toContainText("2× SPEED");
  const cube = page.locator('svg[aria-label="3 × 3 × 3 cube"]:visible').first();
  await expect(cube).toBeVisible();
  const bounds = await cube.evaluate((el) => {
    const outer = el.getBoundingClientRect(),
      inner = el.querySelector("g")!.getBoundingClientRect();
    return {
      outer: {
        x: outer.x,
        y: outer.y,
        right: outer.right,
        bottom: outer.bottom,
      },
      inner: {
        x: inner.x,
        y: inner.y,
        right: inner.right,
        bottom: inner.bottom,
      },
    };
  });
  expect(bounds.inner.x).toBeGreaterThanOrEqual(bounds.outer.x);
  expect(bounds.inner.y).toBeGreaterThanOrEqual(bounds.outer.y);
  expect(bounds.inner.right).toBeLessThanOrEqual(bounds.outer.right);
  expect(bounds.inner.bottom).toBeLessThanOrEqual(bounds.outer.bottom);
});
