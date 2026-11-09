import { toDataURL } from "./images";
let worker: Worker | undefined;
let sequence = 0;
let ready = false;
let preparation: Promise<void> | undefined;
type Progress = { loaded: number; total: number };
const listeners = new Set<(p: Progress) => void>();
const requests = new Map<
  number,
  { resolve: (value?: string) => void; reject: (e: Error) => void }
>();
function getWorker() {
  if (!worker) {
    worker = new Worker(new URL("./background.worker.ts", import.meta.url), {
      type: "module",
    });
    worker.onmessage = async (e) => {
      const d = e.data;
      if (d.type === "progress") listeners.forEach((fn) => fn(d));
      const r = requests.get(d.id);
      if (!r) return;
      if (d.type === "ready") {
        ready = true;
        r.resolve();
        requests.delete(d.id);
      }
      if (d.type === "result") {
        r.resolve(await toDataURL(d.blob));
        requests.delete(d.id);
      }
      if (d.type === "error") {
        r.reject(Error(d.message));
        requests.delete(d.id);
      }
    };
    worker.onerror = () => {
      requests.forEach((r) =>
        r.reject(
          Error(
            "O motor de recorte não iniciou neste navegador. Entre no editor manual.",
          ),
        ),
      );
      requests.clear();
      worker?.terminate();
      worker = undefined;
      ready = false;
      preparation = undefined;
    };
  }
  return worker;
}
function request(src?: string): Promise<string | undefined> {
  return new Promise((resolve, reject) => {
    const id = ++sequence;
    requests.set(id, { resolve, reject });
    getWorker().postMessage({ id, src });
  });
}
export async function prepareBackground(onProgress: (p: Progress) => void) {
  listeners.add(onProgress);
  try {
    if (ready) return;
    preparation ??= request()
      .then(() => {})
      .catch((e) => {
        preparation = undefined;
        throw e;
      });
    await preparation;
  } finally {
    listeners.delete(onProgress);
  }
}
export async function removeBackground(src: string) {
  await prepareBackground(() => {});
  return (await request(src))!;
}
export function modelReady() {
  return ready;
}
