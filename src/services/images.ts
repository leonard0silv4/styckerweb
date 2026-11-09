import type { Project } from "../types/project";
export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const i = new Image();
    i.onload = () => resolve(i);
    i.onerror = () =>
      reject(
        Error("Não foi possível abrir esta imagem. Use JPEG, PNG ou WebP."),
      );
    i.src = src;
  });
}
export async function importImage(file: File): Promise<Project> {
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type))
    throw Error("Use uma imagem JPEG, PNG ou WebP. HEIC não é suportado.");
  if (file.size > 20_000_000) throw Error("Escolha uma imagem de até 20 MB.");
  const url = URL.createObjectURL(file);
  try {
    const image = await loadImage(url);
    if (image.width * image.height > 48_000_000)
      throw Error("A imagem é muito grande. Reduza para até 48 megapixels.");
    const scale = Math.min(1, 1024 / Math.max(image.width, image.height));
    const c = document.createElement("canvas");
    c.width = Math.round(image.width * scale);
    c.height = Math.round(image.height * scale);
    c.getContext("2d")!.drawImage(image, 0, 0, c.width, c.height);
    const data = c.toDataURL(
      file.type === "image/jpeg" ? "image/jpeg" : "image/png",
      0.88,
    );
    return {
      version: 1,
      original: data,
      image: data,
      photo: {
        x: 256,
        y: 256,
        scale: Math.min(440 / c.width, 440 / c.height),
        angle: 0,
      },
      texts: [],
      border: { color: "#ffffff", width: 0 },
    };
  } finally {
    URL.revokeObjectURL(url);
  }
}
export function blobFromCanvas(
  c: HTMLCanvasElement,
  type = "image/png",
  quality?: number,
): Promise<Blob> {
  return new Promise((resolve, reject) =>
    c.toBlob(
      (b) =>
        b ? resolve(b) : reject(Error("Não foi possível exportar a imagem.")),
      type,
      quality,
    ),
  );
}
export async function toDataURL(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = reject;
    r.readAsDataURL(blob);
  });
}
export function download(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 30000);
}
export async function webp(c: HTMLCanvasElement): Promise<Blob> {
  for (const q of [0.92, 0.8, 0.65, 0.5, 0.35, 0.2, 0.1]) {
    let b = await blobFromCanvas(c, "image/webp", q);
    if (b.type !== "image/webp") {
      const { default: encode } = await import("@jsquash/webp/encode");
      b = new Blob(
        [
          await encode(c.getContext("2d")!.getImageData(0, 0, 512, 512), {
            quality: q * 100,
          }),
        ],
        { type: "image/webp" },
      );
    }
    const bytes = new Uint8Array(await b.slice(0, 12).arrayBuffer());
    if (
      String.fromCharCode(...bytes.slice(0, 4)) !== "RIFF" ||
      String.fromCharCode(...bytes.slice(8, 12)) !== "WEBP"
    )
      throw Error(
        "O navegador não gerou um WebP válido. Baixe PNG como alternativa.",
      );
    if (b.size <= 100 * 1024) return b;
  }
  throw Error(
    "Não foi possível gerar WebP com até 100 KB. Simplifique a imagem ou baixe PNG.",
  );
}
export function copyPNG(blob: Blob): Promise<void> {
  if (!navigator.clipboard?.write || typeof ClipboardItem === "undefined")
    return Promise.reject(
      Error(
        "Não foi possível copiar neste navegador. Tente compartilhar ou baixar a imagem.",
      ),
    );
  return navigator.clipboard
    .write([new ClipboardItem({ "image/png": blob })])
    .catch(() => {
      throw Error(
        "Não foi possível copiar neste navegador. Tente compartilhar ou baixar a imagem.",
      );
    });
}
export async function sharePNG(blob: Blob) {
  const file = new File([blob], "minha-figurinha.png", { type: "image/png" });
  if (!navigator.canShare?.({ files: [file] }))
    throw Error(
      "Este navegador não compartilha arquivos. Use copiar ou baixar PNG.",
    );
  try {
    await navigator.share({ files: [file], title: "Minha figurinha" });
  } catch (e) {
    if (e instanceof Error && e.name === "AbortError") return;
    throw Error("Não foi possível compartilhar. Tente baixar PNG.");
  }
}
export async function outlined(
  source: string,
  width: number,
  color: string,
): Promise<string> {
  if (!width) return source;
  const img = await loadImage(source);
  const c = document.createElement("canvas");
  c.width = img.width + width * 2;
  c.height = img.height + width * 2;
  const ctx = c.getContext("2d")!;
  for (let a = 0; a < Math.PI * 2; a += Math.PI / 24)
    ctx.drawImage(
      img,
      width + Math.cos(a) * width,
      width + Math.sin(a) * width,
    );
  ctx.globalCompositeOperation = "source-in";
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, c.width, c.height);
  ctx.globalCompositeOperation = "source-over";
  ctx.drawImage(img, width, width);
  return c.toDataURL();
}
