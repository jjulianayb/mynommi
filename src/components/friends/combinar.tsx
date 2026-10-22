import { useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { coverStyle } from "@/lib/covers";
import {
  decisaoDoArrasto,
  interessesOrdenados,
  porqueApareceu,
  recadoDaResposta,
  useCombinar,
  type Candidata,
} from "@/lib/combinar";
import { Avatar, Icon } from "./art";
import { EmptyState } from "./surfaces";
import { SafetyMenu } from "./social-feed";
import { useFriends } from "./store";

function Face({ c, size }: { c: Candidata; size: number }) {
  return c.avatar ? (
    <img
      className="real-face"
      src={c.avatar}
      width={size}
      height={size}
      style={{ width: size, height: size }}
      alt={"Foto de " + c.nome}
    />
  ) : (
    <Avatar id={3} size={size} />
  );
}

/** O match: ver os interesses de alguém e, se os dois quiserem, já são amizade. */
export function Combinar({ me }: { me: string }) {
  const { notify } = useFriends();
  const { fila, curiosidade, ready, responder, recarregar } = useCombinar(Boolean(me));
  const [dx, setDx] = useState(0);
  const [saindo, setSaindo] = useState<"sim" | "nao" | null>(null);
  const [deuMatch, setDeuMatch] = useState<Candidata | null>(null);
  const arrasto = useRef<{ x0: number; largura: number } | null>(null);
  const c = fila[0];

  async function decidir(quem: Candidata, sim: boolean) {
    setSaindo(sim ? "sim" : "nao");
    const r = await responder(quem, sim);
    setSaindo(null);
    setDx(0);
    if (r === "match") setDeuMatch(quem);
    else notify(recadoDaResposta(r, quem.nome));
    if (fila.length <= 2) void recarregar();
  }

  if (!ready) return <p className="small-note">Procurando gente com a sua cara…</p>;

  if (deuMatch)
    return (
      <section className="match-feito">
        <span className="match-feito-selo">
          <Icon name="heart" />
        </span>
        <h2>Deu match!</h2>
        <p>
          Você e {deuMatch.nome} se escolheram. Já são amizade na nommi e a conversa está aberta.
        </p>
        <Face c={deuMatch} size={120} />
        {deuMatch.emComum.length > 0 && (
          <p className="match-feito-comum">
            Comecem por aí: vocês dois gostam de {deuMatch.emComum.slice(0, 2).join(" e ")}.
          </p>
        )}
        <div className="match-feito-acoes">
          <Button asChild>
            <Link to="/conversas/$id" params={{ id: deuMatch.userId }}>
              <Icon name="chat" />
              Falar com {deuMatch.nome.split(" ")[0]}
            </Link>
          </Button>
          <Button variant="secondary" onClick={() => setDeuMatch(null)}>
            Ver mais pessoas
          </Button>
        </div>
      </section>
    );

  if (!c)
    return (
      <EmptyState
        title="Por hoje, você viu todo mundo."
        text="A nommi só mostra gente de verdade, então a fila acaba rápido no começo. Chame alguém que você gosta e volte amanhã."
      >
        <Button asChild>
          <Link to="/convidar">
            <Icon name="send" />
            Convidar uma amiga
          </Link>
        </Button>
        <Button asChild variant="secondary">
          <Link to="/grupos">Entrar numa tribo</Link>
        </Button>
      </EmptyState>
    );

  const lista = interessesOrdenados(c);
  const girar = dx / 18;

  return (
    <section className="combinar">
      {curiosidade > 0 && (
        <p className="combinar-curiosidade">
          <Icon name="eye" />
          {curiosidade === 1
            ? "1 pessoa já disse que quer te conhecer. Ela está nesta fila."
            : `${curiosidade} pessoas já disseram que querem te conhecer. Elas estão nesta fila.`}
        </p>
      )}

      <article
        className={"combinar-card" + (saindo ? " saindo-" + saindo : "")}
        style={saindo ? undefined : { transform: `translateX(${dx}px) rotate(${girar}deg)` }}
        onPointerDown={(e) => {
          arrasto.current = { x0: e.clientX, largura: e.currentTarget.clientWidth };
          e.currentTarget.setPointerCapture(e.pointerId);
        }}
        onPointerMove={(e) => {
          if (arrasto.current) setDx(e.clientX - arrasto.current.x0);
        }}
        onPointerUp={() => {
          const a = arrasto.current;
          arrasto.current = null;
          const d = a ? decisaoDoArrasto(dx, a.largura) : null;
          if (d) void decidir(c, d === "sim");
          else setDx(0);
        }}
        onPointerCancel={() => {
          arrasto.current = null;
          setDx(0);
        }}
      >
        <div className="combinar-capa" style={coverStyle(c.capa)}>
          {dx > 60 && <span className="combinar-marca sim">Quero conhecer</span>}
          {dx < -60 && <span className="combinar-marca nao">Agora não</span>}
        </div>

        <div className="combinar-topo">
          <Face c={c} size={96} />
          <h2>
            {c.nome}
            {c.verificada && (
              <span className="selo-verificada" title="Perfil conferido pela nommi">
                <Icon name="check" />
              </span>
            )}
          </h2>
          {c.cidade && (
            <p className="combinar-cidade">
              <Icon name="pin" />
              {c.cidade}
            </p>
          )}
          <p className="combinar-porque">
            <Icon name="spark" />
            {porqueApareceu(c)}
          </p>
        </div>

        <div className="combinar-corpo">
          {lista.length > 0 && (
            <div className="combinar-bloco">
              <h3>Interesses</h3>
              <div className="combinar-tags">
                {lista.map((i) => (
                  <span key={i.nome} className={i.comum ? "comum" : ""}>
                    {i.comum && <Icon name="check" />}
                    {i.nome}
                  </span>
                ))}
              </div>
              {c.emComum.length > 0 && (
                <p className="small-note">O que está marcado é o que vocês dois gostam.</p>
              )}
            </div>
          )}
          {c.procurando && (
            <div className="combinar-bloco">
              <h3>O que está procurando</h3>
              <p>{c.procurando}</p>
            </div>
          )}
          {c.sobre && (
            <div className="combinar-bloco">
              <h3>Sobre</h3>
              <p>{c.sobre}</p>
            </div>
          )}
          {c.lugares.length > 0 && (
            <div className="combinar-bloco">
              <h3>Lugares que gosta</h3>
              <div className="combinar-tags">
                {c.lugares.slice(0, 6).map((l) => (
                  <span key={l}>{l}</span>
                ))}
              </div>
            </div>
          )}
          <Link className="combinar-perfil" to="/nommi/$id" params={{ id: c.userId }}>
            Ver o perfil inteiro de {c.nome.split(" ")[0]}
            <Icon name="arrow" />
          </Link>
        </div>
      </article>

      <div className="combinar-acoes">
        <Button variant="secondary" onClick={() => void decidir(c, false)}>
          <Icon name="close" />
          Agora não
        </Button>
        <Button onClick={() => void decidir(c, true)}>
          <Icon name="heart" />
          Quero conhecer
        </Button>
      </div>
      <p className="small-note combinar-aviso">
        Sua resposta é sua. A pessoa só fica sabendo se ela também quiser te conhecer.
      </p>
      <SafetyMenu me={me} targetUserId={c.userId} targetUserName={c.nome} />
    </section>
  );
}
