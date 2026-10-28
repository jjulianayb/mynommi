import { useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { paraCss } from "@/lib/enquadrar";
import { estiloDoFundo, tomDoFundo } from "@/lib/fundos";
import { figurinhaDe } from "@/lib/figurinhas";
import { figuraDoSelo } from "@/lib/selos";
import {
  decisaoDoArrasto,
  interessesOrdenados,
  porqueApareceu,
  recadoDaResposta,
  useCombinar,
  type Candidata,
} from "@/lib/combinar";
import { SemFoto, Avatar, Icon } from "./art";
import { Esqueleto, EmptyState } from "./surfaces";
import { SafetyMenu } from "./social-feed";
import { useFriends } from "./store";

function Face({ c, size }: { c: Candidata; size: number }) {
  return c.avatar ? (
    <img
      className="real-face"
      src={c.avatar}
      width={size}
      height={size}
      style={{ width: size, height: size, objectPosition: paraCss(c.fotoFoco) }}
      alt={"Foto de " + c.nome}
    />
  ) : (
    <SemFoto nome={c.nome} size={size} />
  );
}

/** O match: o que vocês têm em comum vem antes do rosto. */
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

  if (!ready) return <Esqueleto tipo="cartoes" />;

  if (deuMatch)
    return (
      <section className="match-feito">
        <span className="match-feito-selo">
          <Icon name="heart" />
        </span>
        <h2>Deu match!</h2>
        <p>Você e {deuMatch.nome} se escolheram. Já são amizade e a conversa está aberta.</p>
        <Face c={deuMatch} size={120} />
        {deuMatch.emComum.length > 0 && (
          <p className="match-feito-comum">
            {deuMatch.emComum.slice(0, 3).map((i) => (
              <span key={i}>
                {figurinhaDe(i)} {i}
              </span>
            ))}
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
  const outros = lista.filter((i) => !i.comum);
  const tom = tomDoFundo(c.fundo);

  return (
    <section className={"combinar tom-" + tom}>
      <div
        className="combinar-fundo"
        style={estiloDoFundo(c.fundo || "teia-mata")}
        aria-hidden="true"
      />

      {curiosidade > 0 && (
        <p className="combinar-curiosidade">
          <Icon name="eye" />
          {curiosidade === 1
            ? "1 pessoa já disse que quer te conhecer"
            : `${curiosidade} pessoas já disseram que querem te conhecer`}
        </p>
      )}

      <article
        className={"combinar-card" + (saindo ? " saindo-" + saindo : "")}
        style={saindo ? undefined : { transform: `translateX(${dx}px) rotate(${dx / 22}deg)` }}
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
        {dx > 60 && <span className="combinar-marca sim">✓</span>}
        {dx < -60 && <span className="combinar-marca nao">✕</span>}

        {c.emComum.length > 0 ? (
          <>
            <p className="combinar-chamada">Vocês dois gostam de</p>
            <div className="combinar-nos">
              {c.emComum.slice(0, 4).map((i) => (
                <span key={i}>
                  <b>{figurinhaDe(i)}</b>
                  {i}
                </span>
              ))}
            </div>
          </>
        ) : (
          <p className="combinar-chamada solta">{porqueApareceu(c)}</p>
        )}

        <div className="combinar-anel">
          <Face c={c} size={150} />
        </div>

        <h2>
          {c.nome}
          {c.verificada && (
            <span className="selo-verificada" title="Perfil conferido pela nommi">
              <Icon name="check" />
            </span>
          )}
        </h2>
        <p className="combinar-cidade">
          {c.cidade || "Brasil"}
          {c.tribosEmComum > 0 &&
            ` · ${c.tribosEmComum} ${c.tribosEmComum === 1 ? "tribo" : "tribos"} em comum`}
        </p>

        {c.selosDoPovo.length > 0 && (
          <div className="combinar-selos">
            <p>Os amigos dizem</p>
            <div>
              {c.selosDoPovo.slice(0, 3).map((x) => (
                <span key={x}>
                  {figuraDoSelo(x)} {x}
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="combinar-resto">
          {c.procurando && (
            <>
              <h3>O que está procurando</h3>
              <p>{c.procurando}</p>
            </>
          )}
          {outros.length > 0 && (
            <div className="combinar-outros">
              {outros.slice(0, 6).map((i) => (
                <span key={i.nome}>
                  {figurinhaDe(i.nome)} {i.nome}
                </span>
              ))}
            </div>
          )}
          <Link className="combinar-perfil" to="/nommi/$id" params={{ id: c.userId }}>
            Ver o perfil inteiro
            <Icon name="arrow" />
          </Link>
        </div>
      </article>

      <div className="combinar-acoes">
        <button
          type="button"
          className="decidir nao"
          aria-label={"Agora não, " + c.nome}
          onClick={() => void decidir(c, false)}
        >
          ✕
        </button>
        <button
          type="button"
          className="decidir sim"
          aria-label={"Quero conhecer " + c.nome}
          onClick={() => void decidir(c, true)}
        >
          ✓
        </button>
      </div>

      <div className="combinar-rodape">
        <SafetyMenu me={me} targetUserId={c.userId} targetUserName={c.nome} />
      </div>
    </section>
  );
}

/** A primeira coisa da página inicial: gente, e o que vocês têm em comum. */
export function PessoasParaVoce({ me }: { me: string }) {
  const { fila, curiosidade, ready } = useCombinar(Boolean(me));
  if (!ready || fila.length === 0) return null;
  return (
    <section className="home-section pessoas-para-voce" data-tour="pessoas">
      <div className="section-heading">
        <h2>Gente para você conhecer</h2>
        <Link to="/descobrir" className="section-link">
          Ver todas
          <Icon name="arrow" />
        </Link>
      </div>
      {curiosidade > 0 && (
        <p className="combinar-curiosidade">
          <Icon name="eye" />
          {curiosidade === 1
            ? "1 pessoa já disse que quer te conhecer."
            : `${curiosidade} pessoas já disseram que querem te conhecer.`}
        </p>
      )}
      <div className="pessoas-strip">
        {fila.slice(0, 8).map((c) => (
          <Link className="pessoa-mini" to="/descobrir" key={c.userId}>
            <Face c={c} size={84} />
            <b>{c.nome.split(" ")[0]}</b>
            <span>
              {c.emComum.length > 0
                ? c.emComum.slice(0, 2).map(figurinhaDe).join(" ")
                : c.tribosEmComum > 0
                  ? "mesma tribo"
                  : c.mesmaCidade && c.cidade
                    ? c.cidade
                    : "Chegou agora"}
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
