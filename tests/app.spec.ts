import { test, expect } from "@playwright/test";
import sharp from "sharp";
import { stat } from "node:fs/promises";
const photo = async () =>
  sharp({
    create: {
      width: 600,
      height: 600,
      channels: 4,
      background: { r: 220, g: 180, b: 140, alpha: 0 },
    },
  })
    .composite([
      {
        input: Buffer.from(
          '<svg width="600" height="600"><circle cx="300" cy="300" r="170" fill="#72a252"/></svg>',
        ),
      },
    ])
    .png()
    .toBuffer();
test("mobile flow: import, text, export, persistence, backup and offline shell", async ({
  page,
  context,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  // This test exercises the manual editor without depending on a 44 MB network transfer.
  await context.route("https://huggingface.co/**", (r) => r.abort());
  await page.goto("/");
  await page
    .getByRole("button", { name: /Entrar enquanto prepara|Editor manual/ })
    .click();
  await expect(
    page.getByRole("heading", { name: /Tem coisa que só/ }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: "test-results/home-mobile.png",
    fullPage: true,
  });
  await page
    .locator("input[type=file]")
    .first()
    .setInputFiles({
      name: "foto.png",
      mimeType: "image/png",
      buffer: await photo(),
    });
  await expect(
    page.getByRole("button", { name: "Salvar", exact: true }),
  ).toBeEnabled();
  await page.getByRole("button", { name: "Texto", exact: true }).click();
  await page.getByRole("button", { name: "Adicionar texto" }).first().click();
  await page
    .getByRole("textbox", { name: "O que vamos dizer?" })
    .fill("É muito eu!");
  await expect(
    page.getByRole("button", { name: "Salvar", exact: true }),
  ).toBeEnabled();
  await page.getByRole("button", { name: "Exportar", exact: true }).click();
  await page
    .getByRole("textbox", { name: "Nome da figurinha" })
    .fill("Meu primeiro sticker");
  const pngDownload = page.waitForEvent("download");
  await page.getByRole("button", { name: "PNG", exact: true }).click();
  const png = await pngDownload;
  await png.saveAs("test-results/export.png");
  const pngMeta = await sharp("test-results/export.png").metadata();
  expect(pngMeta.width).toBe(512);
  expect(pngMeta.height).toBe(512);
  expect(pngMeta.hasAlpha).toBe(true);
  const webpDownload = page.waitForEvent("download");
  await page.getByRole("button", { name: "WebP", exact: true }).click();
  const w = await webpDownload;
  await w.saveAs("test-results/export.webp");
  const webpMeta = await sharp("test-results/export.webp").metadata();
  expect(webpMeta.format).toBe("webp");
  expect(webpMeta.width).toBe(512);
  expect((await stat("test-results/export.webp")).size).toBeLessThanOrEqual(
    102400,
  );
  await page.screenshot({
    path: "test-results/editor-mobile.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "Salvar", exact: true }).click();
  await expect(
    page.getByRole("button", { name: /Meu primeiro sticker/ }),
  ).toBeVisible();
  await page.getByRole("button", { name: /Meu primeiro sticker/ }).click();
  await page.getByRole("button", { name: "Editar", exact: true }).click();
  await page.getByRole("button", { name: "Texto", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Salvar", exact: true }),
  ).toBeEnabled();
  await page.getByRole("button", { name: "Voltar à coleção" }).click();
  await page.getByRole("button", { name: "Backup", exact: true }).click();
  const backupDownload = page.waitForEvent("download");
  await page.getByRole("button", { name: "Exportar backup" }).click();
  await (await backupDownload).saveAs("test-results/backup.json");
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await page.waitForFunction(() => navigator.serviceWorker.controller !== null);
  await context.setOffline(true);
  await page.reload();
  await page
    .getByRole("button", { name: /Entrar enquanto prepara|Editor manual/ })
    .click();
  await expect(
    page.getByRole("button", { name: /Meu primeiro sticker/ }),
  ).toBeVisible();
  await page.getByRole("button", { name: /Meu primeiro sticker/ }).click();
  await page.getByRole("button", { name: "Editar", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Salvar", exact: true }),
  ).toBeEnabled();
  expect(errors).toEqual([]);
});

test("clipboard PNG and real WASM WebP fallback when native encoder is unavailable", async ({
  page,
  context,
}) => {
  await context.route("https://huggingface.co/**", (r) => r.abort());
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.toBlob;
    HTMLCanvasElement.prototype.toBlob = function (callback, type, quality) {
      return original.call(
        this,
        callback,
        type === "image/webp" ? "image/png" : type,
        quality,
      );
    };
  });
  await page.goto("/");
  await page
    .getByRole("button", { name: /Entrar enquanto prepara|Editor manual/ })
    .click();
  await page
    .locator("input[type=file]")
    .first()
    .setInputFiles({
      name: "foto.png",
      mimeType: "image/png",
      buffer: await photo(),
    });
  await expect(
    page.getByRole("button", { name: "Salvar", exact: true }),
  ).toBeEnabled();
  await page.getByRole("button", { name: "Exportar", exact: true }).click();
  await page
    .getByRole("button", { name: "Copiar imagem", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText(
    "Imagem copiada. Abra o WhatsApp e cole na conversa.",
  );
  expect(
    await page.evaluate(async () => {
      const values = await navigator.clipboard.read();
      return values.some((item) => item.types.includes("image/png"));
    }),
  ).toBe(true);
  const downloadEvent = page.waitForEvent("download", { timeout: 15000 });
  await page.getByRole("button", { name: "WebP", exact: true }).click();
  await (await downloadEvent).saveAs("test-results/fallback.webp");
  const meta = await sharp("test-results/fallback.webp").metadata();
  expect(meta.format).toBe("webp");
  expect(meta.width).toBe(512);
  expect(meta.hasAlpha).toBe(true);
  expect((await stat("test-results/fallback.webp")).size).toBeLessThanOrEqual(
    102400,
  );
});
