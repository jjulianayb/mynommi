/*
 * Origem das imagens do Pippo: personagem gerado e construído pela própria Ju.
 * Confirmado por ela em 02/11 às 14:13, com uso liberado como rosto da nommi.
 */
import "./pippo.css";
import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import frontalPippo from "@/assets/pippo/1-pippo-frontal.png";
import apontaPippo from "@/assets/pippo/1-pippo-aponta.png";
import {
  BOAS_VINDAS_DO_PIPPO,
  NAO_SEI_DO_PIPPO,
  RESPOSTAS_DO_PIPPO,
  respostaPara,
  type RespostaDoPippo,
} from "@/lib/pippo-respostas";

/** O Pippo de frente, recortado, com fundo transparente. Usado no cantinho e no tour. */
export { frontalPippo };

export function PippoRosto({ altura = 92 }: { altura?: number }) {
  return <img className="pippo-busto" src={frontalPippo} alt="" style={{ height: altura }} />;
}

type Fala = { de: "pippo" | "voce"; texto: string; ir?: RespostaDoPippo["ir"] };

/** Ajudante fixo no cantinho: conversa com respostas prontas e refaz o tour. */
export function PippoAjudante({ aoRefazerTour }: { aoRefazerTour: () => void }) {
  const [aberto, setAberto] = useState(false);
  const [falas, setFalas] = useState<Fala[]>([{ de: "pippo", texto: BOAS_VINDAS_DO_PIPPO }]);
  const [texto, setTexto] = useState("");
  const fim = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fim.current?.scrollIntoView({ block: "end" });
  }, [falas, aberto]);

  const perguntar = (pergunta: string, r: RespostaDoPippo | null) =>
    setFalas((f) => [
      ...f,
      { de: "voce", texto: pergunta },
      r
        ? { de: "pippo", texto: r.resposta, ir: r.ir }
        : { de: "pippo", texto: NAO_SEI_DO_PIPPO, ir: { to: "/ajuda", rotulo: "Abrir a Ajuda" } },
    ]);

  return (
    <div className="pippo-canto">
      {aberto && (
        <div className="pippo-painel" role="dialog" aria-label="Pippo, seu ajudante">
          <div className="pippo-topo">
            <img className="pippo-aponta" src={apontaPippo} alt="" />
            <div>
              <h2>Pippo</h2>
              <p>Seu ajudante na nommi</p>
            </div>
          </div>
          <div className="pippo-conversa" aria-live="polite">
            {falas.map((f, i) => (
              <div key={i} className={"pippo-fala " + f.de}>
                <p>{f.texto}</p>
                {f.ir && (
                  <Link to={f.ir.to} className="pippo-ir" onClick={() => setAberto(false)}>
                    {f.ir.rotulo}
                  </Link>
                )}
              </div>
            ))}
            <div ref={fim} />
          </div>
          <div className="pippo-perguntas">
            {RESPOSTAS_DO_PIPPO.map((r) => (
              <button key={r.id} type="button" onClick={() => perguntar(r.pergunta, r)}>
                {r.pergunta}
              </button>
            ))}
            <button
              type="button"
              className="pippo-tour"
              onClick={() => {
                setAberto(false);
                aoRefazerTour();
              }}
            >
              Fazer o tour do app
            </button>
          </div>
          <form
            className="pippo-escrever"
            onSubmit={(e) => {
              e.preventDefault();
              const t = texto.trim();
              if (!t) return;
              perguntar(t, respostaPara(t));
              setTexto("");
            }}
          >
            <input
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              placeholder="Pergunte ao Pippo"
              aria-label="Pergunte ao Pippo"
              maxLength={120}
            />
            <button type="submit">Enviar</button>
          </form>
        </div>
      )}
      <button
        type="button"
        className="pippo-botao"
        aria-label={aberto ? "Fechar o Pippo" : "Falar com o Pippo"}
        aria-expanded={aberto}
        onClick={() => setAberto((a) => !a)}
      >
        <PippoRosto altura={92} />
      </button>
    </div>
  );
}
