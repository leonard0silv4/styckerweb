import { useCallback, useEffect, useRef, useState } from "react";
import { Canvas, FabricImage, Textbox, FabricObject } from "fabric";
import {
  ArrowLeft,
  Undo2,
  Redo2,
  Check,
  Type,
  Scissors,
  ScanLine,
  Layers,
  Download,
  Copy,
  Share2,
  Trash2,
  Plus,
  RotateCcw,
  Move,
  ChevronUp,
  ChevronDown,
  LoaderCircle,
} from "lucide-react";
import type { Project, Sticker, TextLayer } from "../types/project";
import { useEditor } from "../stores/editor";
import {
  blobFromCanvas,
  copyPNG,
  download,
  loadImage,
  outlined,
  sharePNG,
  toDataURL,
  webp,
} from "../services/images";
import { modelReady, removeBackground } from "../services/background";
import { MaskEditor } from "./MaskEditor";
interface Props {
  existing?: Sticker;
  save: (s: Sticker) => void;
  close: () => void;
  notify: (s: string) => void;
}
export function Editor({ existing, save, close, notify }: Props) {
  const { project, past, future, dirty, change, undo, redo } = useEditor();
  const p = project!;
  const element = useRef<HTMLCanvasElement>(null);
  const fabric = useRef<Canvas | null>(null);
  const pRef = useRef(p);
  pRef.current = p;
  const generation = useRef(0);
  const suppress = useRef(false);
  const live = useRef(true);
  const [selected, setSelected] = useState<string>("photo");
  const selectedRef = useRef(selected);
  selectedRef.current = selected;
  const [tool, setTool] = useState<
    "photo" | "text" | "border" | "layers" | "export"
  >("photo");
  const [mask, setMask] = useState(false);
  const [busy, setBusy] = useState("");
  const [name, setName] = useState(existing?.name || "Minha figurinha");
  const [png, setPNG] = useState<Blob | null>(null);
  const [rendering, setRendering] = useState(true);
  const text = p.texts.find((t) => t.id === selected);
  const commit = useCallback(() => {
    const c = fabric.current;
    if (!c || suppress.current) return;
    const next = {
      ...pRef.current,
      texts: pRef.current.texts.map((t) => ({ ...t })),
    };
    c.getObjects().forEach((o) => {
      const id = (o as FabricObject & { layerId?: string }).layerId;
      const v = { x: o.left, y: o.top, scale: o.scaleX, angle: o.angle };
      if (id === "photo") next.photo = v;
      else {
        const t = next.texts.find((t) => t.id === id);
        if (t) {
          Object.assign(t, v);
          if (o instanceof Textbox) {
            t.text = o.text;
            t.width = o.width;
          }
        }
      }
    });
    change(next);
  }, [change]);
  useEffect(() => {
    live.current = true;
    const c = new Canvas(element.current!, {
      width: 512,
      height: 512,
      preserveObjectStacking: true,
      selection: false,
      enableRetinaScaling: false,
    });
    fabric.current = c;
    FabricObject.ownDefaults.cornerStyle = "circle";
    FabricObject.ownDefaults.cornerColor = "#b9b0ff";
    FabricObject.ownDefaults.cornerStrokeColor = "#302b70";
    FabricObject.ownDefaults.transparentCorners = false;
    FabricObject.ownDefaults.cornerSize = 13;
    FabricObject.ownDefaults.touchCornerSize = 30;
    FabricObject.ownDefaults.borderColor = "#4f46d8";
    const onSelection = () => {
      const o = c.getActiveObject() as
        (FabricObject & { layerId?: string }) | undefined;
      setSelected(o?.layerId || "photo");
    };
    c.on("selection:created", onSelection);
    c.on("selection:updated", onSelection);
    c.on("object:modified", commit);
    c.on("text:editing:exited", commit);
    return () => {
      live.current = false;
      ++generation.current;
      fabric.current = null;
      void c.dispose();
    };
  }, [commit]);
  useEffect(() => {
    let disposed = false;
    const token = ++generation.current;
    setRendering(true);
    setPNG(null);
    const c = fabric.current;
    if (!c) return;
    const render = async () => {
      await document.fonts.ready;
      const src = await outlined(p.image, p.border.width, p.border.color);
      const photo = await FabricImage.fromURL(src);
      if (disposed || token !== generation.current) return;
      suppress.current = true;
      c.clear();
      photo.set({
        left: p.photo.x,
        top: p.photo.y,
        originX: "center",
        originY: "center",
        scaleX: p.photo.scale,
        scaleY: p.photo.scale,
        angle: p.photo.angle,
      });
      (photo as FabricImage & { layerId: string }).layerId = "photo";
      photo.setControlsVisibility({
        ml: false,
        mr: false,
        mt: false,
        mb: false,
      });
      c.add(photo);
      p.texts.forEach((t) => {
        const o = new Textbox(t.text, {
          left: t.x,
          top: t.y,
          originX: "center",
          originY: "center",
          scaleX: t.scale,
          scaleY: t.scale,
          angle: t.angle,
          width: t.width,
          fontFamily: t.font,
          fontWeight: 800,
          fontSize: t.size,
          fill: t.fill,
          stroke: t.stroke,
          strokeWidth: t.strokeWidth,
          paintFirst: "stroke",
          textAlign: t.align,
          splitByGrapheme: true,
          lockScalingFlip: true,
        });
        (o as Textbox & { layerId: string }).layerId = t.id;
        c.add(o);
      });
      const active = c
        .getObjects()
        .find(
          (o) =>
            (o as FabricObject & { layerId?: string }).layerId ===
            selectedRef.current,
        );
      if (active) c.setActiveObject(active);
      c.renderAll();
      suppress.current = false;
      const canvas = c.toCanvasElement(1, { width: 512, height: 512 });
      const blob = await blobFromCanvas(canvas);
      if (!disposed && token === generation.current) {
        setPNG(blob);
        setRendering(false);
      }
    };
    void render().catch((e) => {
      if (!disposed) {
        suppress.current = false;
        setRendering(false);
        notify(e.message);
      }
    });
    return () => {
      disposed = true;
    };
  }, [p, notify]);
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (dirty) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);
  function patchText(patch: Partial<TextLayer>) {
    if (!text) return;
    change({
      ...p,
      texts: p.texts.map((t) => (t.id === text.id ? { ...t, ...patch } : t)),
    });
  }
  function addText() {
    if (p.texts.length >= 30) {
      notify("Use até 30 textos por figurinha.");
      return;
    }
    const id = crypto.randomUUID();
    setSelected(id);
    setTool("text");
    change({
      ...p,
      texts: [
        ...p.texts,
        {
          id,
          text: "Seu texto aqui",
          x: 256,
          y: 400,
          scale: 1,
          angle: 0,
          font: "Outfit",
          size: 48,
          fill: "#ffffff",
          stroke: "#252b24",
          strokeWidth: 5,
          align: "center",
          width: 420,
        },
      ],
    });
  }
  async function action(task: () => Promise<void>) {
    if (busy) return;
    setBusy("Preparando…");
    try {
      await task();
    } catch (e) {
      notify(
        e instanceof Error
          ? e.message
          : "Não foi possível concluir. Tente novamente.",
      );
    } finally {
      if (live.current) setBusy("");
    }
  }
  async function saveSticker() {
    if (!png) return;
    await action(async () => {
      const now = new Date().toISOString();
      const img = await loadImage(await toDataURL(png));
      const thumb = document.createElement("canvas");
      thumb.width = 160;
      thumb.height = 160;
      thumb.getContext("2d")!.drawImage(img, 0, 0, 160, 160);
      const final = await toDataURL(
        await blobFromCanvas(
          fabric.current!.toCanvasElement(1),
          "image/webp",
          0.85,
        ),
      );
      save({
        version: 1,
        id: existing?.id || crypto.randomUUID(),
        name: name.trim() || "Minha figurinha",
        createdAt: existing?.createdAt || now,
        updatedAt: now,
        thumbnail: thumb.toDataURL("image/webp", 0.75),
        final,
        project: p,
      });
    });
  }
  function exit() {
    if (
      !busy &&
      (!dirty || confirm("Sair sem salvar as alterações desta figurinha?"))
    )
      close();
  }
  return (
    <div className="editor-shell">
      <header className="editor-header">
        <button aria-label="Voltar à coleção" onClick={exit} disabled={!!busy}>
          <ArrowLeft />
        </button>
        <div>
          <span className="eyebrow">ESTÚDIO CRIATIVO</span>
          <strong>{existing ? "Do seu jeitinho" : "Uma nova figurinha"}</strong>
        </div>
        <div className="history">
          <button
            aria-label="Desfazer"
            onClick={undo}
            disabled={!past.length || !!busy}
          >
            <Undo2 size={20} />
          </button>
          <button
            aria-label="Refazer"
            onClick={redo}
            disabled={!future.length || !!busy}
          >
            <Redo2 size={20} />
          </button>
        </div>
        <button
          className="primary"
          onClick={saveSticker}
          disabled={!png || !!busy || rendering}
        >
          <Check size={18} />
          <span>Salvar</span>
        </button>
      </header>
      <main className="editor-main">
        <div className="canvas-area">
          <div className="canvas-meta">
            <span>
              <span className="live-dot" />{" "}
              {dirty ? "Alterações não salvas" : "Seu espaço para criar"}
            </span>
            <span>512 × 512</span>
          </div>
          <div className="canvas-frame checker">
            <canvas ref={element} />
            {(busy || rendering) && (
              <div className="canvas-busy">
                <LoaderCircle className="spin" />
                <strong>{busy || "Atualizando prévia…"}</strong>
              </div>
            )}
          </div>
          <p className="canvas-hint">
            <Move size={14} /> Arraste para mover. Use as alças para girar e
            ampliar.
          </p>
        </div>
        <aside className="editor-panel">
          <div className="tool-tabs">
            {(
              [
                ["photo", Scissors, "Recorte"],
                ["text", Type, "Texto"],
                ["border", ScanLine, "Borda"],
                ["layers", Layers, "Camadas"],
                ["export", Download, "Exportar"],
              ] as const
            ).map(([id, Icon, label]) => (
              <button
                key={id}
                className={tool === id ? "active" : ""}
                onClick={() => setTool(id)}
                disabled={!!busy}
              >
                <Icon size={21} />
                <span>{label}</span>
              </button>
            ))}
          </div>
          <div className="panel-content" inert={!!busy || rendering}>
            {tool === "photo" && (
              <>
                <div className="panel-heading">
                  <div>
                    <span className="eyebrow">COMECE PELA FOTO</span>
                    <h2>Só o que importa.</h2>
                  </div>
                  <Scissors size={24} />
                </div>
                <p>
                  Deixe o assunto brilhar. Tire o fundo e acerte os detalhes.
                </p>
                <button
                  className="primary wide"
                  onClick={() =>
                    void action(async () => {
                      setBusy(
                        modelReady()
                          ? "Recortando no seu aparelho…"
                          : "Preparando modelo de recorte…",
                      );
                      const result = await removeBackground(p.image);
                      if (live.current) change({ ...p, image: result });
                    })
                  }
                >
                  <Scissors size={18} /> Remover fundo
                </button>
                <small className="muted">
                  {modelReady()
                    ? "Modelo pronto. O recorte acontece neste aparelho."
                    : "O modelo precisa ser preparado (~44 MB + motor). Suas fotos não são enviadas."}
                </small>
                <div className="button-grid">
                  <button className="secondary" onClick={() => setMask(true)}>
                    Borracha e recorte
                  </button>
                  <button
                    className="secondary"
                    onClick={() => {
                      const c = fabric.current!,
                        o = c.getObjects()[0];
                      const scale = Math.min(440 / o.width, 440 / o.height);
                      change({
                        ...p,
                        photo: { x: 256, y: 256, scale, angle: 0 },
                      });
                    }}
                  >
                    Ajustar ao quadro
                  </button>
                  <button
                    className="secondary"
                    onClick={() =>
                      change({ ...p, photo: { ...p.photo, x: 256, y: 256 } })
                    }
                  >
                    Centralizar
                  </button>
                  <button
                    className="secondary"
                    onClick={() => change({ ...p, image: p.original })}
                  >
                    <RotateCcw size={16} /> Foto original
                  </button>
                </div>
                <label className="range-label">
                  Zoom da foto{" "}
                  <input
                    type="range"
                    min="0.05"
                    max="3"
                    step=".01"
                    value={p.photo.scale}
                    onChange={(e) =>
                      change({
                        ...p,
                        photo: { ...p.photo, scale: +e.target.value },
                      })
                    }
                  />
                </label>
              </>
            )}
            {tool === "text" && (
              <>
                <div className="panel-heading">
                  <h2>Fale do seu jeito.</h2>
                  <button aria-label="Adicionar texto" onClick={addText}>
                    <Plus />
                  </button>
                </div>
                {!text ? (
                  <>
                    <p>
                      Adicione uma frase ou toque em um texto no quadro para
                      editar.
                    </p>
                    <button className="primary wide" onClick={addText}>
                      <Type size={18} /> Adicionar texto
                    </button>
                  </>
                ) : (
                  <>
                    <label>
                      O que vamos dizer?
                      <textarea
                        maxLength={500}
                        value={text.text}
                        onChange={(e) => patchText({ text: e.target.value })}
                      />
                    </label>
                    <div className="field-row">
                      <label>
                        Fonte
                        <select
                          value={text.font}
                          onChange={(e) => patchText({ font: e.target.value })}
                        >
                          <option>Outfit</option>
                          <option>DM Sans</option>
                          <option>sans-serif</option>
                        </select>
                      </label>
                      <label>
                        Alinhamento
                        <select
                          value={text.align}
                          onChange={(e) =>
                            patchText({
                              align: e.target.value as TextLayer["align"],
                            })
                          }
                        >
                          <option value="left">Esquerda</option>
                          <option value="center">Centro</option>
                          <option value="right">Direita</option>
                        </select>
                      </label>
                    </div>
                    <label className="range-label">
                      Tamanho <span>{text.size}</span>
                      <input
                        type="range"
                        min="12"
                        max="150"
                        value={text.size}
                        onChange={(e) => patchText({ size: +e.target.value })}
                      />
                    </label>
                    <div className="field-row">
                      <label>
                        Cor do texto
                        <input
                          type="color"
                          value={text.fill}
                          onChange={(e) => patchText({ fill: e.target.value })}
                        />
                      </label>
                      <label>
                        Cor do contorno
                        <input
                          type="color"
                          value={text.stroke}
                          onChange={(e) =>
                            patchText({ stroke: e.target.value })
                          }
                        />
                      </label>
                    </div>
                    <label className="range-label">
                      Contorno{" "}
                      <input
                        type="range"
                        min="0"
                        max="15"
                        value={text.strokeWidth}
                        onChange={(e) =>
                          patchText({ strokeWidth: +e.target.value })
                        }
                      />
                    </label>
                    <div className="button-grid">
                      <button
                        className="secondary"
                        onClick={() => {
                          const id = crypto.randomUUID();
                          change({
                            ...p,
                            texts: [
                              ...p.texts,
                              { ...text, id, x: text.x + 10, y: text.y + 10 },
                            ],
                          });
                          setSelected(id);
                        }}
                      >
                        <Copy size={16} /> Duplicar
                      </button>
                      <button
                        className="secondary danger"
                        onClick={() =>
                          change({
                            ...p,
                            texts: p.texts.filter((t) => t.id !== selected),
                          })
                        }
                      >
                        <Trash2 size={16} /> Excluir texto
                      </button>
                    </div>
                  </>
                )}
              </>
            )}
            {tool === "border" && (
              <>
                <span className="eyebrow">O ACABAMENTO</span>
                <h2>Um contorno de personalidade.</h2>
                <p>
                  A borda acompanha o recorte da foto. Para melhores resultados,
                  remova o fundo primeiro.
                </p>
                <label className="range-label">
                  Espessura <span>{p.border.width}px</span>
                  <input
                    type="range"
                    min="0"
                    max="24"
                    value={p.border.width}
                    onChange={(e) =>
                      change({
                        ...p,
                        border: { ...p.border, width: +e.target.value },
                      })
                    }
                  />
                </label>
                <label>
                  Cor da borda
                  <input
                    type="color"
                    value={p.border.color}
                    onChange={(e) =>
                      change({
                        ...p,
                        border: { ...p.border, color: e.target.value },
                      })
                    }
                  />
                </label>
                <div className="swatches">
                  {["#ffffff", "#20243b", "#b9b0ff", "#ffc6b5", "#c6dcff"].map(
                    (color) => (
                      <button
                        key={color}
                        style={{ background: color }}
                        aria-label={`Borda ${color}`}
                        onClick={() =>
                          change({ ...p, border: { ...p.border, color } })
                        }
                      />
                    ),
                  )}
                </div>
              </>
            )}
            {tool === "layers" && (
              <>
                <h2>Cada coisa no seu lugar.</h2>
                <p>As camadas do topo aparecem na frente.</p>
                {[...p.texts].reverse().map((t) => (
                  <div className="layer-row" key={t.id}>
                    <button
                      onClick={() => {
                        setSelected(t.id);
                        setTool("text");
                      }}
                    >
                      <Type size={17} />
                      {t.text.slice(0, 25) || "Texto vazio"}
                    </button>
                    <button
                      aria-label="Trazer texto para frente"
                      onClick={() => {
                        const texts = p.texts.filter((x) => x.id !== t.id);
                        const index = p.texts.indexOf(t);
                        texts.splice(Math.min(texts.length, index + 1), 0, t);
                        change({ ...p, texts });
                      }}
                    >
                      <ChevronUp size={18} />
                    </button>
                    <button
                      aria-label="Enviar texto para trás"
                      onClick={() => {
                        const texts = p.texts.filter((x) => x.id !== t.id);
                        texts.splice(Math.max(0, p.texts.indexOf(t) - 1), 0, t);
                        change({ ...p, texts });
                      }}
                    >
                      <ChevronDown size={18} />
                    </button>
                  </div>
                ))}
                <div className="layer-row">
                  <span>
                    <Scissors size={17} /> Foto · camada de base
                  </span>
                </div>
                <button className="secondary wide" onClick={addText}>
                  <Plus size={18} /> Adicionar texto
                </button>
              </>
            )}
            {tool === "export" && (
              <>
                <span className="eyebrow">PRONTA PARA A CONVERSA</span>
                <h2>Pode espalhar.</h2>
                <p>Copie e cole no WhatsApp ou compartilhe o arquivo.</p>
                <label>
                  Nome da figurinha
                  <input
                    maxLength={100}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </label>
                <button
                  className="primary wide"
                  disabled={!png}
                  onClick={() => {
                    if (png)
                      void copyPNG(png)
                        .then(() =>
                          notify(
                            "Imagem copiada. Abra o WhatsApp e cole na conversa.",
                          ),
                        )
                        .catch((e) => notify(e.message));
                  }}
                >
                  <Copy size={18} /> Copiar imagem
                </button>
                <button
                  className="secondary wide"
                  disabled={!png}
                  onClick={() => {
                    if (png) void sharePNG(png).catch((e) => notify(e.message));
                  }}
                >
                  <Share2 size={18} /> Compartilhar arquivo
                </button>
                <div className="button-grid">
                  <button
                    className="secondary"
                    disabled={!png}
                    onClick={() => png && download(png, "minha-figurinha.png")}
                  >
                    <Download size={17} /> PNG
                  </button>
                  <button
                    className="secondary"
                    onClick={() =>
                      void action(async () =>
                        download(
                          await webp(fabric.current!.toCanvasElement(1)),
                          "minha-figurinha.webp",
                        ),
                      )
                    }
                  >
                    <Download size={17} /> WebP
                  </button>
                </div>
                <small className="muted">
                  PNG transparente · 512 × 512. WebP com até 100 KB. O WhatsApp
                  decide se recebe como foto, arquivo ou figurinha.
                </small>
              </>
            )}
          </div>
        </aside>
      </main>
      {mask && (
        <MaskEditor
          image={p.image}
          original={p.original}
          close={() => setMask(false)}
          done={(image) => {
            change({ ...p, image });
            setMask(false);
          }}
        />
      )}
    </div>
  );
}
