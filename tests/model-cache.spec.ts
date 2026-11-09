import { test, expect } from "@playwright/test";
import sharp from "sharp";
test("real model: prepare, infer, reopen offline and reuse cached weights", async ({
  page,
  context,
}) => {
  test.skip(
    !process.env.TEST_MODEL,
    "Set TEST_MODEL=1 to download and exercise the real model.",
  );
  test.setTimeout(360000);
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => {
    if (["error", "warning"].includes(m.type()))
      console.log("browser:", m.text().slice(0, 300));
  });
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: /Tem coisa que só/ }),
  ).toBeVisible({ timeout: 240000 });
  console.log("Model preparation succeeded.");
  await page
    .locator("input[type=file]")
    .first()
    .setInputFiles("public/icons/icon-512.png");
  await expect(
    page.getByRole("button", { name: "Salvar", exact: true }),
  ).toBeEnabled();
  await page
    .getByRole("button", { name: "Remover fundo", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Salvar", exact: true }),
  ).toBeEnabled({ timeout: 120000 });
  await page.getByRole("button", { name: "Exportar", exact: true }).click();
  const dl = page.waitForEvent("download");
  await page.getByRole("button", { name: "PNG", exact: true }).click();
  await (await dl).saveAs("test-results/real-model-output.png");
  const { data, info } = await sharp("test-results/real-model-output.png")
    .raw()
    .toBuffer({ resolveWithObject: true });
  expect(info.channels).toBe(4);
  let clear = 0,
    opaque = 0;
  for (let i = 3; i < data.length; i += 4) {
    if (data[i] === 0) clear++;
    if (data[i] > 200) opaque++;
  }
  expect(clear).toBeGreaterThan(0);
  expect(opaque).toBeGreaterThan(0);
  await page.getByRole("button", { name: "Salvar", exact: true }).click();
  await expect(
    page.getByRole("button", { name: /Minha figurinha/ }),
  ).toBeVisible();
  expect(
    await page.evaluate(() => {
      const d = JSON.parse(localStorage.getItem("styckerweb.collection.v1")!);
      return (
        d.items[0].project.image !== d.items[0].project.original &&
        d.items[0].project.image !== "@original"
      );
    }),
  ).toBe(true);
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await page.waitForFunction(() => !!navigator.serviceWorker.controller);
  console.log(
    "Caches:",
    await page.evaluate(async () => {
      const names = await caches.keys();
      return Promise.all(
        names.map(async (n) => ({
          name: n,
          count: (await (await caches.open(n)).keys()).length,
        })),
      );
    }),
  );
  await context.setOffline(true);
  await page.reload();
  await expect(
    page.getByRole("heading", { name: /Tem coisa que só/ }),
  ).toBeVisible({ timeout: 120000 });
  console.log("Offline model preparation succeeded without network.");
  await page.getByRole("button", { name: /Minha figurinha/ }).click();
  await page.getByRole("button", { name: "Editar", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Salvar", exact: true }),
  ).toBeEnabled();
  await page
    .getByRole("button", { name: "Remover fundo", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Salvar", exact: true }),
  ).toBeEnabled({ timeout: 120000 });
  expect(errors).toEqual([]);
});
