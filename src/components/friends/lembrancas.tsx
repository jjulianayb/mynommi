import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { enderecoDaImagem } from "@/lib/covers";
import {
  MAX_LEGENDA,
  comQuemFoi,
  quandoFoiORole,
  useLembrancas,
  type Lembranca,
} from "@/lib/lembrancas";
import { Icon } from "./art";
import { Sheet } from "./surfaces";
import { useFriends } from "./store";

/**
 * Os rolês que a pessoa foi, com a última foto de cada um.
 * Antes este espaço era ocupado por rolês de exemplo da apresentação: o lugar
 * mais nobre do Início mostrando coisa que não existe. Agora mostra o que a
 * pessoa viveu, e ela pode guardar a lembrança com uma frase.
 */
export function Lembrancas({ ativo }: { ativo: boolean }) {
  const { notify } = useFriends();
  const { lembrancas, ready, guardar } = useLembrancas(ativo);
  const [editando, setEditando] = useState<Lembranca | null>(null);
  const [legenda, setLegenda] = useState("");
  if (!ativo || !ready) return null;

  return (
    <section className="home-section" data-tour="lembrancas">
      <div className="section-heading">
        <h2>Rolês que você foi</h2>
        <Link to="/convites" className="section-link">
          Ver rolês
          <Icon name="arrow" />
        </Link>
      </div>

      {lembrancas.length === 0 ? (
        <p className="small-note">
          Quando você for a um rolê, ele aparece aqui com a foto e com quem você foi. Fica sendo o
          álbum da sua nommi.
        </p>
      ) : (
        <div className="lembranca-fita">
          {lembrancas.map((l) => (
            <article className={"lembranca" + (l.guardada ? " guardada" : "")} key={l.teiaId}>
              {l.foto ? (
                <img src={enderecoDaImagem(l.foto)} alt={"Foto do rolê " + l.nome} />
              ) : (
                <span className="lembranca-sem-foto" aria-hidden="true">
                  <Icon name="teia" />
                </span>
              )}
              <div className="lembranca-info">
                <h3>{l.nome}</h3>
                <p>{comQuemFoi(l)}</p>
                <small>{quandoFoiORole(l.quando)}</small>
              </div>
              <button
                type="button"
                className="lembranca-guardar"
                aria-label={l.guardada ? "Mudar a frase desta lembrança" : "Guardar esta lembrança"}
                onClick={() => {
                  setEditando(l);
                  setLegenda(l.legenda);
                }}
              >
                <Icon name={l.guardada ? "check" : "plus"} />
              </button>
            </article>
          ))}
        </div>
      )}

      {editando && (
        <Sheet title="Guardar esta lembrança" onClose={() => setEditando(null)}>
          <p className="small-note">
            {editando.nome}
            {editando.comQuem ? ` · com ${editando.comQuem}` : ""}
          </p>
          <label className="field">
            <span>Uma frase sua sobre esse dia</span>
            <input
              className="input"
              value={legenda}
              maxLength={MAX_LEGENDA}
              placeholder="fui com a tribo do karaokê e a gente não parou de rir"
              onChange={(e) => setLegenda(e.target.value)}
            />
          </label>
          <Button
            onClick={async () => {
              const ok = await guardar(editando, legenda);
              notify(ok ? "Lembrança guardada." : "Não deu para guardar agora.");
              if (ok) setEditando(null);
            }}
          >
            <Icon name="check" />
            Guardar
          </Button>
        </Sheet>
      )}
    </section>
  );
}
