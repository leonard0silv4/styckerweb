import { describe, it, expect } from "vitest";
import {
  KEY,
  loadCollection,
  saveCollection,
  parseBackup,
  mergeItems,
  validProject,
} from "./storage";
import type { Sticker } from "../types/project";
const image = "data:image/png;base64,aGVsbG8=";
const item: Sticker = {
  version: 1,
  id: "one",
  name: "Oi",
  createdAt: "2026-11-08T00:00:00Z",
  updatedAt: "2026-11-08T00:00:00Z",
  thumbnail: image,
  final: image,
  project: {
    version: 1,
    original: image,
    image,
    photo: { x: 256, y: 256, scale: 1, angle: 0 },
    texts: [],
    border: { color: "#ffffff", width: 0 },
  },
};
function memory() {
  const data = new Map<string, string>();
  return {
    data,
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => {
      data.set(k, v);
    },
  };
}
describe("collection safeguards", () => {
  it("preserves existing data if a write exceeds quota", () => {
    const storage = memory();
    saveCollection([item], storage);
    const before = storage.getItem(KEY);
    const limited = {
      ...storage,
      setItem: () => {
        throw new DOMException("Full", "QuotaExceededError");
      },
    };
    expect(() =>
      saveCollection([item, { ...item, id: "two" }], limited),
    ).toThrow("Sem espaço");
    expect(storage.getItem(KEY)).toBe(before);
  });
  it("recovers valid records independently and warns about damaged items", () => {
    const storage = memory();
    storage.setItem(
      KEY,
      JSON.stringify({
        version: 1,
        items: [item, { ...item, project: { version: 99 } }, item],
      }),
    );
    const result = loadCollection(storage);
    expect(result.items).toEqual([item]);
    expect(result.warning).toBeTruthy();
  });
  it("does not overwrite unreadable collection during loading", () => {
    const storage = memory();
    storage.setItem(KEY, "{broken");
    expect(loadCollection(storage).warning).toBeTruthy();
    expect(storage.getItem(KEY)).toBe("{broken");
  });
  it("merges conflicts without mutating existing records, skipping exact duplicates", () => {
    expect(mergeItems([item], [item])).toHaveLength(1);
    const next = mergeItems([item], [{ ...item, name: "Mudou" }]);
    expect(next).toHaveLength(2);
    expect(next[0]).toEqual(item);
    expect(next[1].id).not.toBe(item.id);
  });
  it("rejects unexpected backup versions, content, and oversized imports", () => {
    expect(() =>
      parseBackup(JSON.stringify({ version: 2, items: [] })),
    ).toThrow();
    expect(() =>
      parseBackup(
        JSON.stringify({
          version: 1,
          items: [{ ...item, final: "javascript:alert(1)" }],
        }),
      ),
    ).toThrow();
    expect(() => parseBackup(" ".repeat(20_000_001))).toThrow("20 MB");
  });
  it("rejects unsafe numeric transforms and unsupported image or font resources", () => {
    expect(
      validProject({
        ...item.project,
        photo: { ...item.project.photo, scale: Infinity },
      }),
    ).toBe(false);
    expect(
      validProject({ ...item.project, image: "https://external/photo.png" }),
    ).toBe(false);
  });
  it("roundtrips complete editable project through storage and backup", () => {
    const storage = memory();
    saveCollection([item], storage);
    expect(loadCollection(storage).items).toEqual([item]);
    expect(parseBackup(storage.getItem(KEY)!)).toEqual([item]);
  });
});
