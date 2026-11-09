import { useEffect, useState } from "react";
import { ArrowRight, RotateCcw, Sparkles, Sticker } from "lucide-react";
import { prepareBackground } from "../services/background";
export function Splash({ done }: { done: () => void }) {
  const [progress, setProgress] = useState(0);
  const [detail, setDetail] = useState("Conectando ao seu estúdio…");
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    setError("");
    prepareBackground((p) => {
      if (!active) return;
      setProgress(
        Math.min(95, p.total ? Math.round((p.loaded / p.total) * 95) : 0),
      );
      setDetail(
        p.loaded >= p.total
          ? "Recursos baixados. Inicializando o recorte…"
          : `${(p.loaded / 1e6).toFixed(1)} de ${(p.total / 1e6).toFixed(1)} MB · preparando recorte`,
      );
    })
      .then(() => {
        if (active) {
          setProgress(100);
          setDetail("Tudo pronto. Vamos criar!");
          setTimeout(() => active && done(), 350);
        }
      })
      .catch((e) => active && setError(e.message));
    return () => {
      active = false;
    };
  }, [attempt, done]);
  return (
    <div className="splash">
      <div className="splash-glow" />
      <div className="splash-logo">
        <Sticker size={46} />
        <Sparkles className="splash-spark" size={24} />
      </div>
      <span className="eyebrow">SEU PEQUENO ESTÚDIO CRIATIVO</span>
      <h1>
        Minhas
        <br />
        <em>Figurinhas.</em>
      </h1>
      <p>
        Seu jeito de dizer tudo.
        <br />
        Até quando faltam palavras.
      </p>
      <div className="splash-progress">
        <div className="flex justify-between">
          <strong>
            {error
              ? "Vamos tentar de novo?"
              : progress === 100
                ? "Estúdio pronto"
                : "Preparando seu estúdio"}
          </strong>
          <span>{progress}%</span>
        </div>
        <div className="progress-track">
          <div style={{ width: `${progress}%` }} />
        </div>
        <small>{error || detail}</small>
      </div>
      {error ? (
        <div className="flex gap-3">
          <button className="primary" onClick={() => setAttempt((n) => n + 1)}>
            <RotateCcw size={18} /> Tentar novamente
          </button>
          <button onClick={done}>
            Editor manual <ArrowRight size={16} />
          </button>
        </div>
      ) : (
        <button className="text-button" onClick={done}>
          Entrar enquanto prepara <ArrowRight size={16} />
        </button>
      )}
      <div className="splash-note">
        {navigator.onLine
          ? "No primeiro acesso, baixamos o modelo de recorte (~44 MB + motor). Depois, reutilizamos o cache deste navegador."
          : "Sem conexão? O editor manual e sua coleção continuam disponíveis."}
        <br />
        Suas fotos ficam só com você.
      </div>
    </div>
  );
}
