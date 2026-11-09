import { mkdir, copyFile, rm } from "node:fs/promises";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
const require = createRequire(import.meta.url);
const dir = dirname(dirname(require.resolve("onnxruntime-web")));
await rm("public/model-runtime", { recursive: true, force: true });
await mkdir("public/model-runtime", { recursive: true });
for (const file of [
  "ort-wasm-simd-threaded.mjs",
  "ort-wasm-simd-threaded.wasm",
])
  await copyFile(join(dir, "dist", file), join("public/model-runtime", file));
