import type { Project, Sticker } from "../types/project";
export const KEY = "styckerweb.collection.v1";
const dataImage = (x: unknown): x is string =>
  typeof x === "string" &&
  x.length < 8_000_000 &&
  /^data:image\/(png|webp|jpeg);base64,[A-Za-z0-9+/=]+$/.test(x);
const num = (x: unknown, min = -10000, max = 10000): x is number =>
  typeof x === "number" && Number.isFinite(x) && x >= min && x <= max;
const color = (x: unknown) =>
  typeof x === "string" && /^#[0-9a-f]{6}$/i.test(x);
const transform = (x: any) =>
  x &&
  num(x.x) &&
  num(x.y) &&
  num(x.scale, 0.001, 20) &&
  num(x.angle, -3600, 3600);
export function validProject(p: any): p is Project {
  return (
    !!p &&
    p.version === 1 &&
    dataImage(p.original) &&
    dataImage(p.image) &&
    transform(p.photo) &&
    p.border &&
    color(p.border.color) &&
    num(p.border.width, 0, 24) &&
    Array.isArray(p.texts) &&
    p.texts.length <= 30 &&
    p.texts.every(
      (t: any) =>
        transform(t) &&
        typeof t.id === "string" &&
        t.id.length < 100 &&
        typeof t.text === "string" &&
        t.text.length <= 500 &&
        ["DM Sans", "Outfit", "sans-serif"].includes(t.font) &&
        num(t.size, 8, 150) &&
        color(t.fill) &&
        color(t.stroke) &&
        num(t.strokeWidth, 0, 15) &&
        ["left", "center", "right"].includes(t.align) &&
        num(t.width, 20, 512),
    )
  );
}
export function validSticker(s: any): s is Sticker {
  return (
    !!s &&
    s.version === 1 &&
    typeof s.id === "string" &&
    s.id.length < 100 &&
    typeof s.name === "string" &&
    s.name.length <= 100 &&
    typeof s.createdAt === "string" &&
    !isNaN(Date.parse(s.createdAt)) &&
    typeof s.updatedAt === "string" &&
    !isNaN(Date.parse(s.updatedAt)) &&
    dataImage(s.thumbnail) &&
    dataImage(s.final) &&
    validProject(s.project)
  );
}
export interface StorageAdapter {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}
// The wire format reuses the original image when no pixel edits were made.
export function serializeCollection(items: Sticker[]): string {
  return JSON.stringify({
    version: 1,
    items: items.map((s) => ({
      ...s,
      project: {
        ...s.project,
        image:
          s.project.image === s.project.original
            ? "@original"
            : s.project.image,
      },
    })),
  });
}
function hydrate(value: unknown): unknown {
  if (value && typeof value === "object" && "project" in value) {
    const s = value as { project?: Record<string, unknown> };
    if (s.project?.image === "@original")
      return { ...s, project: { ...s.project, image: s.project.original } };
  }
  return value;
}
export function loadCollection(storage: StorageAdapter = localStorage): {
  items: Sticker[];
  warning?: string;
} {
  try {
    const raw = storage.getItem(KEY);
    if (!raw) return { items: [] };
    const parsed = JSON.parse(raw);
    if (parsed.version !== 1 || !Array.isArray(parsed.items)) throw Error();
    const seen = new Set<string>();
    const items = parsed.items
      .map(hydrate)
      .filter(
        (s: unknown) =>
          validSticker(s) && !seen.has(s.id) && (seen.add(s.id), true),
      );
    return {
      items,
      warning:
        items.length !== parsed.items.length
          ? "Alguns registros inválidos foram ignorados. Exporte um backup dos itens recuperados."
          : undefined,
    };
  } catch {
    return {
      items: [],
      warning:
        "Não foi possível ler a coleção. Os dados existentes foram preservados; evite salvar até recuperar o acesso ao armazenamento.",
    };
  }
}
export function saveCollection(
  items: Sticker[],
  storage: StorageAdapter = localStorage,
) {
  if (!items.every(validSticker))
    throw Error("A coleção contém dados inválidos.");
  try {
    storage.setItem(KEY, serializeCollection(items));
  } catch (e) {
    throw Error(
      e instanceof DOMException && e.name === "QuotaExceededError"
        ? "Sem espaço neste navegador. Sua edição continua aberta. Baixe a figurinha, exporte um backup ou exclua itens antigos."
        : "O armazenamento está bloqueado. Sua edição continua aberta; baixe a figurinha para guardá-la.",
    );
  }
}
export function parseBackup(raw: string): Sticker[] {
  if (raw.length > 20_000_000) throw Error("O backup deve ter até 20 MB.");
  const d = JSON.parse(raw);
  if (
    d.version !== 1 ||
    !Array.isArray(d.items) ||
    d.items.length > 300 ||
    !d.items.map(hydrate).every(validSticker)
  )
    throw Error(
      "Backup inválido ou versão não suportada. Nenhum item foi alterado.",
    );
  return d.items.map(hydrate);
}
export function mergeItems(current: Sticker[], incoming: Sticker[]): Sticker[] {
  const ids = new Set(current.map((s) => s.id));
  const result = [...current];
  for (const s of incoming) {
    if (
      current.some(
        (c) => c.id === s.id && JSON.stringify(c) === JSON.stringify(s),
      )
    )
      continue;
    const copy = { ...s, id: ids.has(s.id) ? crypto.randomUUID() : s.id };
    ids.add(copy.id);
    result.push(copy);
  }
  return result;
}
export const usage = (items: Sticker[]) =>
  new Blob([serializeCollection(items)]).size;
