import { useEffect, useRef, useState } from "react";
import { Check, Eraser, RotateCcw, Crop, X } from "lucide-react";
import { loadImage } from "../services/images";
export function MaskEditor({
  image,
  original,
  done,
  close,
}: {
  image: string;
  original: string;
  done: (s: string) => void;
  close: () => void;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  const source = useRef<HTMLImageElement | null>(null);
  const drag = useRef<{ x: number; y: number } | null>(null);
  const previous = useRef<{ x: number; y: number } | null>(null);
  const [mode, setMode] = useState<"erase" | "restore" | "crop">("erase");
  const [size, setSize] = useState(28);
  const [ready, setReady] = useState(false);
  const snapshot = useRef<ImageData | null>(null);
  useEffect(() => {
    let live = true;
    Promise.all([loadImage(image), loadImage(original)]).then(([img, orig]) => {
      if (!live) return;
      const c = ref.current!;
      c.width = img.width;
      c.height = img.height;
      c.getContext("2d")!.drawImage(img, 0, 0);
      source.current = orig;
      setReady(true);
    });
    return () => {
      live = false;
    };
  }, [image, original]);
  function point(e: React.PointerEvent) {
    const r = ref.current!.getBoundingClientRect();
    return {
      x: ((e.clientX - r.left) * ref.current!.width) / r.width,
      y: ((e.clientY - r.top) * ref.current!.height) / r.height,
    };
  }
  function paint(p: { x: number; y: number }) {
    const c = ref.current!,
      ctx = c.getContext("2d")!,
      last = previous.current ?? p;
    const radius = (size * c.width) / 512;
    ctx.save();
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineWidth = radius * 2;
    if (mode === "erase") {
      ctx.globalCompositeOperation = "destination-out";
      ctx.beginPath();
      ctx.moveTo(last.x, last.y);
      ctx.lineTo(p.x + 0.01, p.y);
      ctx.stroke();
    } else {
      ctx.beginPath();
      ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
      ctx.clip();
      ctx.clearRect(p.x - radius, p.y - radius, radius * 2, radius * 2);
      ctx.drawImage(source.current!, 0, 0, c.width, c.height);
    }
    ctx.restore();
    previous.current = p;
  }
  return (
    <div className="modal-backdrop">
      <section
        className="dialog mask-dialog"
        role="dialog"
        aria-modal="true"
        aria-label="Corrigir recorte"
      >
        <header>
          <h2>Um toque de precisão</h2>
          <button aria-label="Fechar correção" onClick={close}>
            <X />
          </button>
        </header>
        <p>
          Apague o fundo ou restaure partes da foto. Em Recortar, arraste um
          retângulo.
        </p>
        <div className="mask-stage checker">
          <canvas
            ref={ref}
            onPointerDown={(e) => {
              if (!ready) return;
              e.currentTarget.setPointerCapture(e.pointerId);
              drag.current = point(e);
              snapshot.current = e.currentTarget
                .getContext("2d")!
                .getImageData(
                  0,
                  0,
                  e.currentTarget.width,
                  e.currentTarget.height,
                );
              if (mode !== "crop") paint(point(e));
            }}
            onPointerMove={(e) => {
              if (!drag.current) return;
              const p = point(e);
              if (mode === "crop") {
                const ctx = e.currentTarget.getContext("2d")!;
                ctx.putImageData(snapshot.current!, 0, 0);
                ctx.strokeStyle = "#517b3e";
                ctx.lineWidth = 4;
                ctx.strokeRect(
                  drag.current.x,
                  drag.current.y,
                  p.x - drag.current.x,
                  p.y - drag.current.y,
                );
              } else paint(p);
            }}
            onPointerUp={(e) => {
              if (!drag.current) return;
              if (mode === "crop") {
                const c = e.currentTarget,
                  ctx = c.getContext("2d")!,
                  p = point(e),
                  start = drag.current;
                ctx.putImageData(snapshot.current!, 0, 0);
                const x = Math.min(p.x, start.x),
                  y = Math.min(p.y, start.y),
                  w = Math.abs(p.x - start.x),
                  h = Math.abs(p.y - start.y);
                if (w > 5 && h > 5) {
                  const piece = ctx.getImageData(x, y, w, h);
                  ctx.clearRect(0, 0, c.width, c.height);
                  ctx.putImageData(piece, x, y);
                }
              }
              drag.current = null;
              previous.current = null;
            }}
            onPointerCancel={() => {
              if (snapshot.current && ref.current)
                ref.current
                  .getContext("2d")!
                  .putImageData(snapshot.current, 0, 0);
              drag.current = null;
              previous.current = null;
            }}
          />
        </div>
        <div className="tool-tabs">
          {(
            [
              ["erase", Eraser, "Apagar"],
              ["restore", RotateCcw, "Restaurar"],
              ["crop", Crop, "Recortar"],
            ] as const
          ).map(([id, Icon, label]) => (
            <button
              className={mode === id ? "active" : ""}
              key={id}
              onClick={() => setMode(id)}
            >
              <Icon size={19} />
              {label}
            </button>
          ))}
        </div>
        {mode !== "crop" && (
          <label className="range-label">
            Tamanho da ponta{" "}
            <input
              type="range"
              min="4"
              max="70"
              value={size}
              onChange={(e) => setSize(+e.target.value)}
            />
          </label>
        )}
        <button
          className="primary wide"
          disabled={!ready}
          onClick={() => done(ref.current!.toDataURL())}
        >
          <Check size={18} /> Aplicar recorte
        </button>
      </section>
    </div>
  );
}
