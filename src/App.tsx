import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowDownToLine,
  ArrowRight,
  Camera,
  Check,
  ChevronRight,
  Clipboard,
  CloudOff,
  Copy,
  Download,
  FolderHeart,
  HardDrive,
  Heart,
  ImagePlus,
  Layers,
  MoreHorizontal,
  Plus,
  Search,
  Share2,
  ShieldCheck,
  Sparkles,
  Sticker as StickerIcon,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { useRegisterSW } from "virtual:pwa-register/react";
import { Editor } from "./components/Editor";
import { Splash } from "./components/Splash";
import { useEditor } from "./stores/editor";
import type { Sticker } from "./types/project";
import {
  importImage,
  blobFromCanvas,
  copyPNG,
  download,
  loadImage,
  sharePNG,
  webp,
} from "./services/images";
import {
  loadCollection,
  saveCollection,
  mergeItems,
  parseBackup,
  usage,
  serializeCollection,
} from "./services/storage";
export default function App() {
  const [splash, setSplash] = useState(true);
  const finishSplash = useCallback(() => setSplash(false), []);
  const [initial] = useState(() => loadCollection());
  const [items, setItems] = useState(initial.items);
  const [storageWarning, setStorageWarning] = useState(initial.warning);
  const [message, setMessage] = useState("");
  const [view, setView] = useState<"collection" | "storage" | "help">(
    "collection",
  );
  const [existing, setExisting] = useState<Sticker>();
  const [active, setActive] = useState<Sticker>();
  const [search, setSearch] = useState("");
  const [busy, setBusy] = useState(false);
  const [online, setOnline] = useState(navigator.onLine);
  const [pending, setPending] = useState<Sticker[] | null>(null);
  const [prepared, setPrepared] = useState<Blob | null>(null);
  const [install, setInstall] = useState<
    | (Event & {
        prompt: () => Promise<void>;
        userChoice: Promise<{ outcome: string }>;
      })
    | null
  >(null);
  const fileRef = useRef<HTMLInputElement>(null),
    cameraRef = useRef<HTMLInputElement>(null),
    backupRef = useRef<HTMLInputElement>(null);
  const project = useEditor((s) => s.project);
  const notify = useCallback((s: string) => setMessage(s), []);
  const {
    needRefresh: [needRefresh],
    offlineReady: [offlineReady],
    updateServiceWorker,
  } = useRegisterSW();
  useEffect(() => {
    if (!message) return;
    const t = setTimeout(() => setMessage(""), 8000);
    return () => clearTimeout(t);
  }, [message]);
  useEffect(() => {
    const on = () => setOnline(navigator.onLine);
    const prompt = (e: Event) => {
      e.preventDefault();
      setInstall(e as typeof install);
    };
    window.addEventListener("online", on);
    window.addEventListener("offline", on);
    window.addEventListener("beforeinstallprompt", prompt);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", on);
      window.removeEventListener("beforeinstallprompt", prompt);
    };
  }, []);
  const importing = useRef(false);
  const start = useCallback(
    async (file: File) => {
      if (importing.current) return;
      importing.current = true;
      setBusy(true);
      try {
        const p = await importImage(file);
        setExisting(undefined);
        useEditor.getState().open(p);
        useEditor.setState({ dirty: true });
        setActive(undefined);
      } catch (e) {
        notify((e as Error).message);
      } finally {
        importing.current = false;
        setBusy(false);
      }
    },
    [notify],
  );
  useEffect(() => {
    const paste = (e: ClipboardEvent) => {
      if (useEditor.getState().project) return;
      const file = [...(e.clipboardData?.files || [])].find((f) =>
        f.type.startsWith("image/"),
      );
      if (file) {
        e.preventDefault();
        void start(file);
      }
    };
    window.addEventListener("paste", paste);
    return () => window.removeEventListener("paste", paste);
  }, [start]);
  useEffect(() => {
    let live = true;
    setPrepared(null);
    if (active)
      void loadImage(active.final)
        .then(async (img) => {
          const c = document.createElement("canvas");
          c.width = 512;
          c.height = 512;
          c.getContext("2d")!.drawImage(img, 0, 0, 512, 512);
          const b = await blobFromCanvas(c);
          if (live) setPrepared(b);
        })
        .catch((e) => notify(e.message));
    return () => {
      live = false;
    };
  }, [active, notify]);
  function persist(next: Sticker[]) {
    if (storageWarning)
      throw Error(
        "O armazenamento precisa ser recuperado antes de salvar. Exporte um backup dos itens legíveis e confira se os dados do site estão liberados.",
      );
    saveCollection(next);
    setItems(next);
  }
  function save(s: Sticker) {
    persist([s, ...items.filter((i) => i.id !== s.id)]);
    useEditor.getState().markSaved();
    useEditor.getState().close();
    notify("Figurinha guardada. Agora é só puxar conversa!");
  }
  async function pasteImage() {
    try {
      if (!navigator.clipboard?.read)
        throw Error(
          "Use a opção Colar do seu teclado ou escolha uma foto da galeria.",
        );
      const values = await navigator.clipboard.read();
      for (const value of values) {
        const type = value.types.find((t) =>
          ["image/png", "image/jpeg", "image/webp"].includes(t),
        );
        if (type) {
          await start(
            new File([await value.getType(type)], "imagem-colada", { type }),
          );
          return;
        }
      }
      throw Error("Não encontramos uma imagem na área de transferência.");
    } catch (e) {
      notify(
        e instanceof Error && e.name === "NotAllowedError"
          ? "A leitura da área de transferência não foi permitida. Use a galeria ou cole com o teclado."
          : (e as Error).message,
      );
    }
  }
  async function readBackup(file: File) {
    try {
      if (file.size > 20_000_000) throw Error("O backup deve ter até 20 MB.");
      setPending(parseBackup(await file.text()));
    } catch (e) {
      notify((e as Error).message);
    }
  }
  const filtered = items.filter((i) =>
    i.name
      .toLocaleLowerCase("pt-BR")
      .includes(search.toLocaleLowerCase("pt-BR")),
  );
  return (
    <>
      {splash ? (
        <Splash done={finishSplash} />
      ) : project ? (
        <Editor
          existing={existing}
          save={save}
          close={() => useEditor.getState().close()}
          notify={notify}
        />
      ) : (
        <div
          className="app-shell"
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            const f = e.dataTransfer.files[0];
            if (f) void start(f);
          }}
        >
          <header className="topbar">
            <button className="brand" onClick={() => setView("collection")}>
              <span className="brand-icon">
                <StickerIcon size={24} />
              </span>
              <span>
                minhas<span className="brand-light">figurinhas</span>
                <i>•</i>
              </span>
            </button>
            <div className="desktop-nav">
              <button
                className={view === "collection" ? "current" : ""}
                onClick={() => setView("collection")}
              >
                Minha coleção
              </button>
              <button
                className={view === "storage" ? "current" : ""}
                onClick={() => setView("storage")}
              >
                Backup e espaço
              </button>
            </div>
            <button
              className="icon-button help-button"
              aria-label="Como funciona"
              onClick={() => setView("help")}
            >
              <span>?</span>
            </button>
          </header>
          <main className="home-main">
            {!online && (
              <div className="notice">
                <CloudOff size={18} /> Você está offline. Sua coleção e o editor
                manual continuam aqui.
              </div>
            )}
            {storageWarning && (
              <div className="notice warning">
                {storageWarning}
                <button
                  onClick={() => {
                    const r = loadCollection();
                    setItems(r.items);
                    setStorageWarning(r.warning);
                  }}
                >
                  Tentar ler novamente
                </button>
              </div>
            )}
            {needRefresh && (
              <div className="notice">
                Uma versão fresquinha está disponível.
                <button onClick={() => void updateServiceWorker(true)}>
                  Atualizar app
                </button>
              </div>
            )}
            {view === "collection" && (
              <>
                <section className="hero">
                  <div className="hero-copy">
                    <span className="eyebrow">
                      <span className="live-dot" /> UM POUCO MAIS VOCÊ, EM CADA
                      CONVERSA
                    </span>
                    <h1>
                      Tem coisa que só
                      <br />
                      uma <span className="hand-underline">figurinha</span> diz
                      <span className="accent-period">.</span>
                    </h1>
                    <p>
                      Transforme suas fotos em reações.
                      <br />
                      Recorte, escreva e mande do seu jeito.
                    </p>
                    <button
                      className="primary create-button"
                      disabled={busy}
                      onClick={() => fileRef.current?.click()}
                    >
                      <Plus size={21} />
                      {busy ? "Abrindo sua foto…" : "Criar figurinha"}
                      <ArrowRight size={19} />
                    </button>
                    <div className="privacy-line">
                      <ShieldCheck size={15} />
                      <span>
                        Sem cadastro. Suas fotos ficam no seu aparelho.
                      </span>
                    </div>
                  </div>
                  <div
                    className="hero-art"
                    aria-label="Ilustrações de figurinhas criativas"
                  >
                    <span className="art-star star-one">✳</span>
                    <div className="sticker-illustration happy">
                      <div className="eyes">
                        <i />
                        <i />
                      </div>
                      <div className="smile" />
                      <span className="cheek left" />
                      <span className="cheek right" />
                    </div>
                    <div className="sticker-illustration type-sticker">
                      é muito
                      <br />
                      <span>eu!</span>
                      <Heart size={21} fill="currentColor" />
                    </div>
                    <div className="sticker-illustration mini-sticker">
                      <span>✌</span>
                    </div>
                    <span className="art-star star-two">✦</span>
                    <span className="art-doodle">feito por você ↗</span>
                  </div>
                </section>
                <section className="import-strip">
                  <div className="import-label">
                    <ImagePlus size={22} />
                    <div>
                      <strong>Uma foto, mil possibilidades.</strong>
                      <span>Escolha como começar</span>
                    </div>
                  </div>
                  <div className="import-actions">
                    <button
                      onClick={() => fileRef.current?.click()}
                      disabled={busy}
                    >
                      <ImagePlus size={19} />
                      Galeria
                      <ChevronRight size={15} />
                    </button>
                    <button
                      onClick={() => cameraRef.current?.click()}
                      disabled={busy}
                    >
                      <Camera size={19} />
                      Câmera
                      <ChevronRight size={15} />
                    </button>
                    <button onClick={() => void pasteImage()} disabled={busy}>
                      <Clipboard size={19} />
                      Colar imagem
                      <ChevronRight size={15} />
                    </button>
                  </div>
                </section>
                <section className="collection">
                  <div className="collection-heading">
                    <div>
                      <span className="eyebrow">FEITAS POR VOCÊ</span>
                      <h2>
                        Minha coleção{" "}
                        <span>{items.length.toString().padStart(2, "0")}</span>
                      </h2>
                    </div>
                    {items.length > 0 && (
                      <label className="search">
                        <Search size={18} />
                        <input
                          aria-label="Buscar figurinha"
                          placeholder="Buscar figurinha"
                          value={search}
                          onChange={(e) => setSearch(e.target.value)}
                        />
                      </label>
                    )}
                  </div>
                  {items.length === 0 ? (
                    <div className="empty-collection">
                      <div className="empty-icon">
                        <FolderHeart size={36} />
                        <span>✦</span>
                      </div>
                      <h3>Suas melhores reações moram aqui.</h3>
                      <p>
                        Aquela foto engraçada está esperando virar figurinha.
                        <br />
                        Crie a primeira e comece sua coleção.
                      </p>
                      <button
                        className="text-button"
                        onClick={() => fileRef.current?.click()}
                      >
                        Vamos criar a primeira <ArrowRight size={17} />
                      </button>
                    </div>
                  ) : (
                    <div className="sticker-grid">
                      {filtered.map((s) => (
                        <button
                          className="sticker-card"
                          key={s.id}
                          onClick={() => setActive(s)}
                        >
                          <div className="sticker-preview">
                            <img src={s.thumbnail} alt={s.name} />
                            <span>
                              <MoreHorizontal size={20} />
                            </span>
                          </div>
                          <strong>{s.name}</strong>
                          <small>
                            {new Date(s.createdAt).toLocaleDateString("pt-BR", {
                              day: "numeric",
                              month: "short",
                            })}
                          </small>
                        </button>
                      ))}
                      <button
                        className="add-card"
                        onClick={() => fileRef.current?.click()}
                      >
                        <Plus size={27} />
                        <span>Mais uma ideia?</span>
                      </button>
                      {filtered.length === 0 && (
                        <p>Nenhuma figurinha com esse nome.</p>
                      )}
                    </div>
                  )}
                </section>
                <section className="bottom-note">
                  <div>
                    <ShieldCheck size={21} />
                    <div>
                      <strong>Sua criatividade. Sua privacidade.</strong>
                      <p>Sem upload de fotos, sem conta, sem complicação.</p>
                    </div>
                  </div>
                  <button onClick={() => setView("storage")}>
                    Cuide da sua coleção <ArrowRight size={17} />
                  </button>
                </section>
              </>
            )}
            {view === "storage" && (
              <section className="settings-page">
                <span className="eyebrow">UM CANTINHO SEGURO</span>
                <h1>Cuide da sua coleção.</h1>
                <p>
                  As figurinhas ficam neste navegador e aparelho. Limpar os
                  dados do site pode apagar sua coleção. Exporte um backup para
                  guardar uma cópia.
                </p>
                <div className="settings-card">
                  <HardDrive size={28} />
                  <h2>
                    {(usage(items) / 1024 / 1024).toFixed(2)} MB{" "}
                    <span>usados pela coleção</span>
                  </h2>
                  <p>
                    Estimativa dos dados da aplicação. A capacidade varia por
                    navegador. O modelo de recorte usa um cache separado e não
                    entra nesta conta.
                  </p>
                  <div className="button-grid">
                    <button
                      className="primary"
                      onClick={() =>
                        download(
                          new Blob([serializeCollection(items)], {
                            type: "application/json",
                          }),
                          "minhas-figurinhas-backup.json",
                        )
                      }
                    >
                      <Download size={18} /> Exportar backup
                    </button>
                    <button
                      className="secondary"
                      onClick={() => backupRef.current?.click()}
                    >
                      <Upload size={18} /> Importar backup
                    </button>
                  </div>
                </div>
                <div className="settings-card">
                  <ShieldCheck size={26} />
                  <h2>Só neste aparelho.</h2>
                  <p>
                    Não há sincronização entre aparelhos. Ao importar, os itens
                    são mesclados e os conflitos recebem novos identificadores.
                    Nada é apagado automaticamente.
                  </p>
                </div>
              </section>
            )}
            {view === "help" && (
              <section className="settings-page">
                <span className="eyebrow">VAMOS CRIAR?</span>
                <h1>Da foto para a conversa.</h1>
                <div className="help-steps">
                  {[
                    [
                      "01",
                      "Escolha uma foto",
                      "Importe da galeria, tire uma foto ou cole uma imagem JPEG, PNG ou WebP.",
                    ],
                    [
                      "02",
                      "Dê seu toque",
                      "Remova o fundo, corrija com a borracha, adicione textos e uma borda.",
                    ],
                    [
                      "03",
                      "Leve para a conversa",
                      "Copie a imagem e cole no WhatsApp. Compartilhar e baixar também estão disponíveis. O resultado no WhatsApp depende do aparelho e do aplicativo.",
                    ],
                  ].map(([n, t, d]) => (
                    <div className="settings-card" key={n}>
                      <span className="step-number">{n}</span>
                      <h2>{t}</h2>
                      <p>{d}</p>
                    </div>
                  ))}
                </div>
                <div className="settings-card">
                  <ArrowDownToLine size={26} />
                  <h2>Seu estúdio na tela inicial.</h2>
                  {install ? (
                    <button
                      className="primary"
                      onClick={() => void install.prompt()}
                    >
                      Instalar aplicativo
                    </button>
                  ) : (
                    <p>
                      No iPhone: abra no Safari, toque em Compartilhar e em
                      “Adicionar à Tela de Início”. No Android: procure
                      “Instalar aplicativo” no menu do Chrome.
                    </p>
                  )}
                  <p>
                    {offlineReady
                      ? "O editor e a coleção já estão prontos para abrir offline."
                      : "Abra o app conectado uma vez para preparar o uso offline."}{" "}
                    O modelo de recorte é preparado na abertura e reutiliza o
                    cache, quando disponível. O navegador pode remover dados
                    temporários para liberar espaço.
                  </p>
                </div>
              </section>
            )}
            <footer className="site-footer">
              <span>
                <StickerIcon size={16} /> Feito para suas conversas.
              </span>
              <span>100% seu. Até o jeito de criar.</span>
            </footer>
          </main>
          <nav className="mobile-nav" aria-label="Navegação principal">
            <button
              className={view === "collection" ? "active" : ""}
              onClick={() => setView("collection")}
            >
              <Layers size={21} />
              <span>Coleção</span>
            </button>
            <button
              className="mobile-create"
              onClick={() => fileRef.current?.click()}
              disabled={busy}
            >
              <Plus size={25} />
              <span>Criar</span>
            </button>
            <button
              className={view === "storage" ? "active" : ""}
              onClick={() => setView("storage")}
            >
              <HardDrive size={21} />
              <span>Backup</span>
            </button>
          </nav>
        </div>
      )}
      <input
        hidden
        ref={fileRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void start(f);
          e.target.value = "";
        }}
      />
      <input
        hidden
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void start(f);
          e.target.value = "";
        }}
      />
      <input
        hidden
        ref={backupRef}
        type="file"
        accept="application/json,.json"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void readBackup(f);
          e.target.value = "";
        }}
      />
      {message && (
        <div role="status" className="toast">
          <span>{message}</span>
          <button aria-label="Fechar aviso" onClick={() => setMessage("")}>
            <X size={18} />
          </button>
        </div>
      )}
      {active && !project && (
        <div className="modal-backdrop" onClick={() => setActive(undefined)}>
          <section
            className="dialog sticker-dialog"
            role="dialog"
            aria-modal="true"
            aria-label="Ações da figurinha"
            onClick={(e) => e.stopPropagation()}
          >
            <header>
              <h2>{active.name}</h2>
              <button
                aria-label="Fechar ações"
                onClick={() => setActive(undefined)}
              >
                <X />
              </button>
            </header>
            <img
              className="dialog-preview checker"
              src={active.final}
              alt={active.name}
            />
            <button
              className="primary wide"
              disabled={!prepared}
              onClick={() =>
                prepared &&
                void copyPNG(prepared)
                  .then(() =>
                    notify(
                      "Imagem copiada. Abra o WhatsApp e cole na conversa.",
                    ),
                  )
                  .catch((e) => notify(e.message))
              }
            >
              <Copy size={18} /> Copiar imagem
            </button>
            <div className="button-grid">
              <button
                className="secondary"
                onClick={() => {
                  setExisting(active);
                  useEditor.getState().open(active.project);
                  setActive(undefined);
                }}
              >
                <Sparkles size={17} /> Editar
              </button>
              <button
                className="secondary"
                disabled={!prepared}
                onClick={() =>
                  prepared &&
                  void sharePNG(prepared).catch((e) => notify(e.message))
                }
              >
                <Share2 size={17} /> Compartilhar
              </button>
              <button
                className="secondary"
                disabled={!prepared}
                onClick={() =>
                  prepared && download(prepared, "minha-figurinha.png")
                }
              >
                <Download size={17} /> PNG
              </button>
              <button
                className="secondary"
                onClick={() =>
                  void (async () => {
                    try {
                      const img = await loadImage(active.final);
                      const c = document.createElement("canvas");
                      c.width = 512;
                      c.height = 512;
                      c.getContext("2d")!.drawImage(img, 0, 0, 512, 512);
                      download(await webp(c), "minha-figurinha.webp");
                    } catch (e) {
                      notify((e as Error).message);
                    }
                  })()
                }
              >
                <Download size={17} /> WebP
              </button>
              <button
                className="secondary"
                onClick={() => {
                  try {
                    persist([
                      {
                        ...active,
                        id: crypto.randomUUID(),
                        name: `${active.name.slice(0, 88)} (cópia)`,
                        createdAt: new Date().toISOString(),
                      },
                      ...items,
                    ]);
                    setActive(undefined);
                    notify("Uma cópia foi adicionada à coleção.");
                  } catch (e) {
                    notify((e as Error).message);
                  }
                }}
              >
                <Copy size={17} /> Duplicar
              </button>
              <button
                className="secondary danger"
                onClick={() => {
                  if (
                    confirm(
                      `Excluir “${active.name}”? Esta ação não pode ser desfeita.`,
                    )
                  ) {
                    try {
                      persist(items.filter((s) => s.id !== active.id));
                      setActive(undefined);
                    } catch (e) {
                      notify((e as Error).message);
                    }
                  }
                }}
              >
                <Trash2 size={17} /> Excluir
              </button>
            </div>
          </section>
        </div>
      )}
      {pending && (
        <div className="modal-backdrop">
          <section
            className="dialog"
            role="dialog"
            aria-modal="true"
            aria-label="Confirmar importação de backup"
          >
            <header>
              <h2>Sua coleção vai crescer.</h2>
              <button
                aria-label="Cancelar importação"
                onClick={() => setPending(null)}
              >
                <X />
              </button>
            </header>
            <p>
              Encontramos {pending.length} figurinhas no backup. Vamos mesclar
              com as {items.length} deste aparelho, preservando os itens
              existentes.
            </p>
            <button
              className="primary wide"
              onClick={() => {
                try {
                  persist(mergeItems(items, pending));
                  setPending(null);
                  notify("Backup restaurado. Sua coleção está reunida.");
                } catch (e) {
                  notify((e as Error).message);
                }
              }}
            >
              <Check size={18} /> Importar {pending.length} figurinhas
            </button>
            <button className="secondary wide" onClick={() => setPending(null)}>
              Cancelar
            </button>
          </section>
        </div>
      )}
    </>
  );
}
