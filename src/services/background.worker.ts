import { pipeline, env } from "@huggingface/transformers";
env.allowLocalModels = false;
// Optional model metadata may return 404 online and is not stored by the library.
// Offline misses must remain 404 so optional files can fall back without a failed fetch.
const networkFetch = env.fetch;
env.fetch = (input, options) => {
  const url = String(input instanceof Request ? input.url : input);
  if (!navigator.onLine && /^https?:/.test(url))
    return Promise.resolve(new Response(null, { status: 404 }));
  return networkFetch(input, options);
};
env.useBrowserCache = true;
env.backends.onnx.wasm!.numThreads = 1;
env.backends.onnx.wasm!.wasmPaths = {
  mjs: "/model-runtime/ort-wasm-simd-threaded.mjs",
  wasm: "/model-runtime/ort-wasm-simd-threaded.wasm",
};
let model: Awaited<ReturnType<typeof createModel>> | undefined;
const progress = new Map<string, { loaded: number; total: number }>();
async function createModel() {
  return pipeline("background-removal", "onnx-community/ormbg-ONNX", {
    revision: "034e2d884afbab897e10e78fc5bb566b29533fd6",
    dtype: "q8",
    device: "wasm",
    progress_callback: (event) => {
      if (
        "file" in event &&
        event.file.endsWith(".onnx") &&
        "loaded" in event &&
        "total" in event &&
        typeof event.loaded === "number" &&
        typeof event.total === "number"
      ) {
        progress.set("file" in event ? event.file : "total", {
          loaded: event.loaded,
          total: event.total,
        });
        const all = [...progress.values()];
        self.postMessage({
          type: "progress",
          loaded: all.reduce((a, b) => a + b.loaded, 0),
          total: all.reduce((a, b) => a + b.total, 0),
        });
      }
    },
  });
}
self.onmessage = async (event: MessageEvent<{ id: number; src?: string }>) => {
  const id = event.data.id;
  try {
    model ??= await createModel();
    if (!event.data.src) {
      self.postMessage({ type: "ready", id });
      return;
    }
    self.postMessage({ type: "processing", id });
    const result = await model(event.data.src);
    self.postMessage({ type: "result", blob: await result.toBlob(), id });
  } catch (error) {
    if (!event.data.src)
      console.warn(
        "Model initialization failed:",
        error instanceof Error ? error.message : "unknown",
      );
    model = undefined;
    self.postMessage({
      type: "error",
      id,
      message:
        "Não foi possível preparar o recorte. Confira a conexão e tente novamente, ou entre no editor manual.",
    });
  }
};
