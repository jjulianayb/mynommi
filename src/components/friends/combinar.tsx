import { useEffect, useRef, useState } from "react";
import "./combinar.css";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { paraCss } from "@/lib/enquadrar";
import { estiloDoFundo, fundoEhFoto, tomDoFundo } from "@/lib/fundos";
import { iconeDoInteresse } from "@/lib/figurinhas";

import {
  decisaoDoArrasto,
  interessesOrdenados,
  porqueApareceu,
  recadoDaResposta,
  useCombinar,
  useConhecidas,
  type Candidata,
  type Conhecida,
} from "@/lib/combinar";
import { fraseTetoDePerfis } from "@/lib/plano";
import { Icon, SemFoto } from "./art";
import { Esqueleto, EmptyState } from "./surfaces";
import { TrilhoTribos } from "./descobrir-tribos";
import { SafetyMenu } from "./social-feed";
import { useFriends } from "./store";

const CONFETE = [
  { left: "6%", cor: "#FFB400", atraso: "0s" },
  { left: "18%", cor: "#EF675A", atraso: ".12s" },
  { left: "30%", cor: "#8FD3B0", atraso: ".05s" },
  { left: "42%", cor: "#FFB400", atraso: ".2s" },
  { left: "54%", cor: "#EF675A", atraso: ".08s" },
  { left: "66%", cor: "#8FD3B0", atraso: ".26s" },
  { left: "78%", cor: "#FFB400", atraso: ".15s" },
  { left: "90%", cor: "#EF675A", atraso: ".3s" },
];

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

/**
 * Quanto tempo a carta leva para sair da tela.
 *
 * É animação, não espera: a decisão já foi tomada e a próxima carta já está
 * desenhada atrás. Curto o bastante para a fila andar rápido, longo o
 * bastante para a pessoa ver para que lado a carta foi.
 */
const SAIDA_DA_CARTA_MS = 170;

/** A comemoração do match sai sozinha, sem precisar de toque. */
const TEMPO_DA_COMEMORACAO_MS = 3600;

/** O match: o que vocês têm em comum vem antes do rosto. */
export function Combinar({ me }: { me: string }) {
  const { notify } = useFriends();
  const { fila, curiosidade, doDia, ready, responder, recarregar } = useCombinar(Boolean(me));
  const { lista: conhecidas } = useConhecidas(me || null);
  const [filtro, setFiltro] = useState<string | null>(null);
  const [dx, setDx] = useState(0);
  const [saindo, setSaindo] = useState<"sim" | "nao" | null>(null);
  const [deuMatch, setDeuMatch] = useState<Candidata | null>(null);
  const arrasto = useRef<{ x0: number; largura: number } | null>(null);
  const vista = filtro ? fila.filter((x) => x.interesses.includes(filtro)) : fila;
  const c = vista[0];
  const atras = vista[1];
  const opcoesFiltro = [...new Set(fila.flatMap((x) => x.interesses))].slice(0, 8);

  /**
   * Decidir não espera a rede.
   *
   * Antes, a carta só saía depois que o servidor respondia, e no meio disso
   * vinha um aviso na tela a cada toque. Dava a sensação de pedir licença para
   * ver a próxima pessoa. Agora a carta sai na hora, a próxima já está
   * desenhada atrás, e a resposta do servidor chega em silêncio: só aparece
   * algo na tela se der match ou se der erro.
   */
  function decidir(quem: Candidata, sim: boolean) {
    if (saindo) return; // duplo toque não gasta duas pessoas da fila
    setSaindo(sim ? "sim" : "nao");
    window.setTimeout(() => {
      setSaindo(null);
      setDx(0);
      void (async () => {
        const r = await responder(quem, sim);
        if (r === "match") setDeuMatch(quem);
        else if (r === "erro" || r === "limite") notify(recadoDaResposta(r, quem.nome));
        // Recarrega com folga, para a fila nunca acabar na mão da pessoa.
        if (fila.length <= 4) void recarregar();
      })();
    }, SAIDA_DA_CARTA_MS);
  }

  // A comemoração do match não tranca mais a fila: ela aparece por alguns
  // segundos e sai sozinha, e quem quiser falar agora tem o botão ali.
  useEffect(() => {
    if (!deuMatch) return;
    const t = window.setTimeout(() => setDeuMatch(null), TEMPO_DA_COMEMORACAO_MS);
    return () => window.clearTimeout(t);
  }, [deuMatch]);

  if (!ready) return <Esqueleto tipo="cartoes" />;

  const comemoracao = deuMatch && (
      <section className="deu-match" onClick={() => setDeuMatch(null)}>
        <div className="deu-match-ceu" aria-hidden="true">
          {CONFETE.map((c, i) => (
            <span key={i} style={{ left: c.left, background: c.cor, animationDelay: c.atraso }} />
          ))}
        </div>
        <p className="deu-match-grito">Vocês deram match!</p>
        <div className="deu-match-rostos">
          <span className="deu-match-eu">
            <SemFoto nome="você" size={104} />
          </span>
          <span className="deu-match-coracao">
            <Icon name="heart" />
          </span>
          <span className="deu-match-ela">
            <Face c={deuMatch} size={104} />
          </span>
        </div>
        <h2>Você e {deuMatch.nome.split(" ")[0]} querem se conhecer</h2>
        {deuMatch.emComum.length > 0 ? (
          <p className="deu-match-comum">
            {deuMatch.emComum.slice(0, 3).map((i) => (
              <span key={i}>
                <Icon name={iconeDoInteresse(i)} />
                {i}
              </span>
            ))}
          </p>
        ) : (
          <p className="deu-match-sub">Já são amizade. A conversa está aberta.</p>
        )}
        <div className="deu-match-acoes">
          <Button asChild>
            <Link to="/conversas/$id" params={{ id: deuMatch.userId }}>
              <Icon name="chat" />
              Falar agora
            </Link>
          </Button>
          <Button variant="ghost" onClick={() => setDeuMatch(null)}>
            Ver mais pessoas
          </Button>
        </div>
      </section>
  );

  const trilhoConhecidas = conhecidas.length > 0 && (
    <section className="dc-conhecidas" aria-label="Continue suas conexões">
      <h3 className="dc-secao-titulo">Continue suas conexões</h3>
      <div className="dc-trilho">
        {conhecidas.map((k: Conhecida) => (
          <article key={k.userId} className="dc-mini">
            <Link
              to="/nommi/$id"
              params={{ id: k.userId }}
              className="dc-mini-foto"
              aria-label={"Ver o perfil de " + k.nome}
            >
              {k.avatar ? (
                <img src={k.avatar} alt={"Foto de " + k.nome} />
              ) : (
                <SemFoto nome={k.nome} size={112} />
              )}
            </Link>
            <h4>{k.nome}</h4>
            <p>{k.cidade || "Brasil"}</p>
            {k.tribosEmComum.length > 0 && (
              <p className="dc-mini-tribos">
                <Icon name="teia" />
                {k.tribosEmComum.length === 1
                  ? `1 tribo em comum: ${k.tribosEmComum[0]}`
                  : `${k.tribosEmComum.length} tribos em comum`}
              </p>
            )}
            {k.interesses.length > 0 && (
              <div className="dc-tags">
                {k.interesses.slice(0, 2).map((i) => (
                  <span key={i}>
                    <Icon name={iconeDoInteresse(i)} />
                    {i}
                  </span>
                ))}
              </div>
            )}
            <Button asChild className="dc-conversar">
              <Link to="/conversas/$id" params={{ id: k.userId }}>
                <Icon name="chat" />
                Conversar
              </Link>
            </Button>
          </article>
        ))}
      </div>
    </section>
  );

  const trilhoTribos = <TrilhoTribos me={me} />;

  const faixaFiltros = opcoesFiltro.length > 1 && (
    <div className="dc-filtros" role="group" aria-label="Filtrar por interesse">
      <button
        type="button"
        className={"dc-chip" + (filtro === null ? " ativa" : "")}
        onClick={() => setFiltro(null)}
      >
        Todas
      </button>
      {opcoesFiltro.map((i) => (
        <button
          key={i}
          type="button"
          className={"dc-chip" + (filtro === i ? " ativa" : "")}
          onClick={() => setFiltro(filtro === i ? null : i)}
        >
          <Icon name={iconeDoInteresse(i)} />
          {i}
        </button>
      ))}
    </div>
  );

  if (!c)
    return (
      <>
        {comemoracao}
      {trilhoConhecidas}
      {trilhoTribos}
      <EmptyState
        title={doDia && doDia.restantes === 0 ? "Por hoje é só." : "Acabou a fila por hoje."}
        text={
          doDia && doDia.restantes === 0
            ? fraseTetoDePerfis(doDia.pro)
            : "Chama uma amiga sua pra cá e volta amanhã, que a fila enche de novo."
        }
      >
        {doDia && doDia.restantes === 0 && !doDia.pro && (
          <Button asChild>
            <Link to="/pro">
              <Icon name="spark" />
              Conhecer o Pro
            </Link>
          </Button>
        )}
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
      </>
    );

  const lista = interessesOrdenados(c);
  const outros = lista.filter((i) => !i.comum);
  const tom = tomDoFundo(c.fundo);

  return (
    <section className={"combinar tom-" + tom}>
      {comemoracao}
      {faixaFiltros}
      <div
        className={"combinar-fundo" + (fundoEhFoto(c.fundo) ? " foto" : "")}
        style={estiloDoFundo(c.fundo || "teia-mata")}
        aria-hidden="true"
      />

      {/* A carta de trás, com o fundo da próxima pessoa aparecendo pelas
          beiradas. Sem ela, cada decisão mostrava um buraco antes da carta
          seguinte, e era isso que dava sensação de lentidão — não a rede.
          É uma placa, sem rosto e sem nome: rosto aqui ficaria desalinhado do
          rosto da carta de cima e pareceria duas cartas empilhadas de lado. */}
      {atras && (
        <div
          className="combinar-atras"
          aria-hidden="true"
          style={estiloDoFundo(atras.fundo || "teia-mata")}
        />
      )}

      {curiosidade > 0 && (
        <p className="combinar-curiosidade">
          <Icon name="eye" />
          {curiosidade === 1
            ? "1 pessoa já disse que quer te conhecer"
            : `${curiosidade} pessoas já disseram que querem te conhecer`}
        </p>
      )}

      <article
        className={"combinar-card dc-card-superficie" + (saindo ? " saindo-" + saindo : "")}
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
        {dx > 60 && (
          <span className="combinar-marca sim">
            <Icon name="check" />
          </span>
        )}
        {dx < -60 && (
          <span className="combinar-marca nao">
            <Icon name="close" />
          </span>
        )}

        <div className="dc-foto">
          <Face c={c} size={340} />
          <button
            type="button"
            className="dc-coracao"
            aria-label={"Quero conhecer " + c.nome}
            onClick={(e) => {
              e.stopPropagation();
              void decidir(c, true);
            }}
          >
            <Icon name="heart" />
          </button>
        </div>

        <h2 className="dc-nome">
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

        {c.emComum.length > 0 ? (
          <p className="combinar-chamada">
            Vocês dois gostam de {c.emComum.slice(0, 3).join(", ")}
          </p>
        ) : (
          <p className="combinar-chamada solta">{porqueApareceu(c)}</p>
        )}

        {c.selosDoPovo.length > 0 && (
          <div className="combinar-selos">
            <p>Os amigos dizem</p>
            <div>
              {c.selosDoPovo.slice(0, 3).map((x) => (
                <span key={x}>
                  <Icon name="star" />
                  {x}
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
            <div className="combinar-outros dc-tags">
              {outros.slice(0, 6).map((i) => (
                <span key={i.nome}>
                  <Icon name={iconeDoInteresse(i.nome)} />
                  {i.nome}
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

      <div className="combinar-acoes dc-decidir">
        <Button className="dc-conectar" onClick={() => void decidir(c, true)}>
          <Icon name="users" />
          Conectar
        </Button>
        <button
          type="button"
          className="dc-passar"
          aria-label={"Agora não, " + c.nome}
          onClick={() => void decidir(c, false)}
        >
          Agora não
        </button>
      </div>

      <div className="combinar-rodape">
        <SafetyMenu me={me} targetUserId={c.userId} targetUserName={c.nome} />
      </div>
      {trilhoConhecidas}
      {trilhoTribos}
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
                ? c.emComum.slice(0, 2).join(" · ")
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
