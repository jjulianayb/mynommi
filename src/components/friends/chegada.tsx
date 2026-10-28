import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Icon } from "./art";
import { useFriends } from "./store";
import {
  useChegada,
  faseDaTribo,
  faltamPara,
  fraseDoPulso,
  meuConvite,
  linkDoConvite,
  textoDoConvite,
} from "@/lib/chegada";

const PASSOS = [
  {
    icon: "teia",
    titulo: "Tribo é gente com algo em comum",
    texto: "Café, trilha, jogos, maternidade. Você entra pelo interesse, não por estar sozinha.",
  },
  {
    icon: "heart",
    titulo: "Amizade acontece de dois jeitos",
    texto:
      "No match, quando vocês dois querem se conhecer. E na tribo, conversando — sem precisar marcar nada.",
  },
  {
    icon: "pin",
    titulo: "Quando der vontade, marque",
    texto: "Alguém abre um rolê com dia, lugar e vagas, e quem quiser diz “Quero ir”. É opcional.",
  },
  {
    icon: "lock",
    titulo: "O que se conta ali, fica ali",
    texto: "Cada tribo tem o “Só entre nós”: o que se escreve some sozinho e não sai do grupo.",
  },
];

/** Primeira tela de quem acabou de entrar: entender, escolher tribos e chamar alguém. */
export function Chegada({ me, onPronto }: { me: string; onPronto?: () => void }) {
  const { state, notify } = useFriends();
  const { sugeridas, pulso, ready, entrar } = useChegada(me);
  const [passo, setPasso] = useState(0);
  const [entrando, setEntrando] = useState<number | null>(null);
  const [codigo, setCodigo] = useState("");

  useEffect(() => {
    void meuConvite(me, state.nickname || "nommi").then((c) => setCodigo(c ?? ""));
  }, [me, state.nickname]);

  const entrei = sugeridas.filter((t) => t.iAmMember).length;
  const link =
    codigo && typeof window !== "undefined" ? linkDoConvite(codigo, window.location.origin) : "";

  return (
    <section className="chegada">
      <div className="chegada-passos">
        {PASSOS.map((p, i) => (
          <article
            key={p.titulo}
            className={"chegada-passo" + (i === passo ? " ativo" : "")}
            onClick={() => setPasso(i)}
          >
            <span className="chegada-icone">
              <Icon name={p.icon} />
            </span>
            <div>
              <b>{p.titulo}</b>
              <p>{p.texto}</p>
            </div>
          </article>
        ))}
      </div>

      {pulso && (
        <p className="chegada-pulso">
          <span className="pulso-ponto" aria-hidden="true" />
          {fraseDoPulso(pulso)}
        </p>
      )}

      <div className="section-heading">
        <h2>Entre em três tribos</h2>
        <span className="small-note">{entrei} de 3</span>
      </div>
      <p className="small-note">
        A nommi está começando, e isso tem uma vantagem: quem chega agora é quem forma a primeira
        roda.
      </p>

      {!ready ? (
        <p className="small-note">Procurando tribos com a sua cara…</p>
      ) : (
        <div className="chegada-tribos">
          {sugeridas.map((t, i) => {
            const faltam = faltamPara(t.members, t.goal);
            return (
              <article
                className="chegada-tribo"
                key={t.id}
                style={{ animationDelay: i * 70 + "ms" }}
              >
                <div className="chegada-tribo-topo">
                  <span className="tone-icon teal">
                    <Icon name="teia" />
                  </span>
                  <div>
                    <h3>{t.name}</h3>
                    <p>{faseDaTribo(t.members, t.goal)}</p>
                  </div>
                </div>
                {t.about && <p className="chegada-tribo-sobre">{t.about}</p>}
                {t.goal != null && (
                  <div className="chegada-barra" aria-hidden="true">
                    <span
                      style={{ width: Math.min(100, Math.round((t.members / t.goal) * 100)) + "%" }}
                    />
                  </div>
                )}
                <div className="group-card-bottom">
                  {t.iAmMember ? (
                    <Button asChild variant="secondary">
                      <Link to="/grupos/$id" params={{ id: String(t.id) }}>
                        <Icon name="check" />
                        Você está aqui
                      </Link>
                    </Button>
                  ) : (
                    <Button
                      disabled={entrando === t.id}
                      onClick={async () => {
                        setEntrando(t.id);
                        const ok = await entrar(t.id, state.nickname || "nommi");
                        setEntrando(null);
                        notify(
                          ok ? "Você entrou! Diga oi para a tribo." : "Não deu para entrar agora.",
                        );
                      }}
                    >
                      <Icon name="plus" />
                      {entrando === t.id ? "Entrando…" : "Entrar"}
                    </Button>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}

      <div className="chegada-convite">
        <h2>Traga quem você já queria ver mais</h2>
        <p className="small-note">
          A tribo enche mais rápido com gente que você conhece. Quem entra pelo seu convite já chega
          com alguém dentro.
        </p>
        {link && (
          <div className="row">
            <Button
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(textoDoConvite(state.nickname || "", link));
                  notify("Convite copiado. Cole no WhatsApp.");
                } catch {
                  notify("Não deu para copiar. Segure o texto para copiar à mão.");
                }
              }}
            >
              <Icon name="link" />
              Copiar convite
            </Button>
            <a
              className="chegada-zap"
              href={`https://wa.me/?text=${encodeURIComponent(textoDoConvite(state.nickname || "", link))}`}
              target="_blank"
              rel="noreferrer"
            >
              Abrir no WhatsApp
            </a>
          </div>
        )}
      </div>

      {onPronto && (
        <Button variant="ghost" className="wide" onClick={onPronto}>
          Ver meu início
          <Icon name="arrow" />
        </Button>
      )}
    </section>
  );
}
