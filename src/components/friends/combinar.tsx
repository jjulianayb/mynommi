import { useEffect, useRef, useState } from "react";
import "./combinar.css";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { paraCss } from "@/lib/enquadrar";
import { iconeDoInteresse } from "@/lib/figurinhas";

import {
  OPCOES_PROCURANDO,
  interessesOrdenados,
  opcoesDeFiltro,
  porqueApareceu,
  recadoDaResposta,
  useCombinar,
  useConhecidas,
  type Candidata,
  type Conhecida,
} from "@/lib/combinar";
import { fraseTetoDePerfis } from "@/lib/plano";
import { rotuloEstadoCivil, iconeEstadoCivil } from "@/lib/pagina-pessoal";
import { useSeloDe, mostraAroPro } from "@/lib/embaixadora";
import { Icon, SemFoto, AroPro } from "./art";
import { Esqueleto, EmptyState } from "./surfaces";
import { BannerTribos, TrilhoMinhasTribos } from "./descobrir-tribos";
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
  // Foto quebrada (URL velha, arquivo apagado) cai no bonequinho, nunca no
  // ícone de imagem quebrada do navegador.
  const [quebrou, setQuebrou] = useState(false);
  const selo = useSeloDe(c.userId, true);
  const rosto =
    c.avatar && !quebrou ? (
      <img
        className="real-face"
        src={c.avatar}
        width={size}
        height={size}
        style={{ width: size, height: size, objectPosition: paraCss(c.fotoFoco) }}
        alt={"Foto de " + c.nome}
        onError={() => setQuebrou(true)}
      />
    ) : (
      <SemFoto nome={c.nome} size={size} />
    );
  return mostraAroPro(selo) ? <AroPro>{rosto}</AroPro> : rosto;
}

/**
 * Quanto tempo a carta leva para sair da tela.
 *
 * É animação, não espera: a decisão já foi tomada e a próxima carta já está
 * desenhada atrás. Curto o bastante para a fila andar rápido, longo o
 * bastante para a pessoa ver para que lado a carta foi.
 */
/** Miniatura do trilho com o mesmo cuidado: erro de imagem vira bonequinho. */
function FotoMini({ k }: { k: Conhecida }) {
  const [quebrou, setQuebrou] = useState(false);
  return k.avatar && !quebrou ? (
    <img src={k.avatar} alt={"Foto de " + k.nome} onError={() => setQuebrou(true)} />
  ) : (
    <SemFoto nome={k.nome} size={112} />
  );
}

/** Fotinha do chip: as capas recortadas do mockup, por palavra do interesse. */
const FOTO_DO_CHIP: [RegExp, string][] = [
  [/cinema|filme|serie/, "/capas-tribos/cinema-e-series.png"],
  [/music|show|cant|karaok|samba|rock/, "/capas-tribos/musica.png"],
  [/praia|piscina/, "/capas-tribos/praia.png"],
  [/viag|trilha|mochil/, "/capas-tribos/viagens.png"],
  [/bem.?estar|yoga|medit|corrid|caminh|saude/, "/capas-tribos/bem-estar.png"],
  [/livro|leitur|literat/, "/capas-tribos/livros.png"],
  [/cafe|cafeter/, "/capas-tribos/cafe.png"],
  [/churras/, "/capas-tribos/churrasco.png"],
  [/culin|cozinh|comida|doce|gastronom|feira/, "/capas-tribos/culinaria.png"],
  [/futebol|volei|basquete|academia|muscula|ciclis|pedal|bike|esporte|skate|surf/, "/capas-tribos/esportes.png"],
  [/pet|cachorr|gato|animal/, "/capas-tribos/pets.png"],
  [/game|jogo|tecnolog|podcast/, "/capas-tribos/games.png"],
  [/danc|festa|forro|salsa|sertanej/, "/capas-tribos/danca.png"],
];
export function fotoDoChip(i: string): string | null {
  const k = i
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
  return FOTO_DO_CHIP.find(([r]) => r.test(k))?.[1] ?? null;
}
export function ChipIcone({ i }: { i: string }) {
  const f = fotoDoChip(i);
  return f ? <img className="dc-chip-foto" src={f} alt="" aria-hidden="true" /> : <Icon name={iconeDoInteresse(i)} />;
}

const SAIDA_DA_CARTA_MS = 170;

/** A comemoração do match sai sozinha, sem precisar de toque. */
const TEMPO_DA_COMEMORACAO_MS = 3600;

/** O match: o que vocês têm em comum vem antes do rosto. */
export function Combinar({ me }: { me: string }) {
  const { notify } = useFriends();
  const [filtroProcurando, setFiltroProcurando] = useState<string | null>(null);
  const { fila, curiosidade, doDia, ready, responder, recarregar } = useCombinar(Boolean(me), {
    procurando: filtroProcurando ? [filtroProcurando] : undefined,
  });
  const { lista: conhecidas } = useConhecidas(me || null);
  const [filtro, setFiltro] = useState<string | null>(null);
  const [deuMatch, setDeuMatch] = useState<Candidata | null>(null);
  const vista = filtro ? fila.filter((x) => x.interesses.includes(filtro)) : fila;
  const c = vista[0];
  const opcoesFiltro = opcoesDeFiltro(fila);

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
    void (async () => {
      const r = await responder(quem, sim);
      if (r === "match") setDeuMatch(quem);
      else if (r === "erro" || r === "limite") notify(recadoDaResposta(r, quem.nome));
      // Recarrega com folga, para a fila nunca acabar na mão da pessoa.
      if (fila.length <= 4) void recarregar();
    })();
  }

  /**
   * Profundidade do carrossel: conforme a carta sai do centro ela gira, desce
   * e encolhe um pouco, e a do centro fica maior — o efeito do mockup da Ju
   * (02/11). Feito no scroll, então o deslize acompanha o dedo.
   */
  const telaRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const tela = telaRef.current;
    if (!tela) return;
    const limpar = [...tela.querySelectorAll<HTMLDivElement>(".dc-carrossel")].map((el) => {
      let quadro = 0;
      const aplicar = () => {
        quadro = 0;
        const caixa = el.getBoundingClientRect();
        const centro = caixa.left + el.clientWidth / 2;
        el.querySelectorAll<HTMLElement>(".dc-pessoa").forEach((carta) => {
          const r = carta.getBoundingClientRect();
          const d = Math.max(-1.4, Math.min(1.4, (r.left + r.width / 2 - centro) / r.width));
          const a = Math.abs(d);
          carta.style.transform = `rotate(${d * 6}deg) translateY(${a * 26}px) scale(${1 - a * 0.08})`;
          carta.style.zIndex = String(10 - Math.round(a * 8));
        });
      };
      const aoRolar = () => {
        if (!quadro) quadro = requestAnimationFrame(aplicar);
      };
      aplicar();
      el.addEventListener("scroll", aoRolar, { passive: true });
      window.addEventListener("resize", aoRolar);
      return () => {
        el.removeEventListener("scroll", aoRolar);
        window.removeEventListener("resize", aoRolar);
        if (quadro) cancelAnimationFrame(quadro);
      };
    });
    return () => limpar.forEach((f) => f());
  }, [vista.length, conhecidas.length, ready]);

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
        <p className="deu-match-sub">A conversa de vocês já está aberta.</p>
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
    <section className="dc-conhecidas" aria-label="Suas conexões">
      <h3 className="dc-secao-titulo">Suas conexões</h3>
      <p className="dc-conhecidas-sub">Quem já se conectou com você. Puxa uma conversa.</p>
      <div className="dc-carrossel dc-baralho-amigos" role="list">
        {conhecidas.map((k: Conhecida) => (
          <article key={k.userId} className="dc-pessoa" role="listitem">
            <div className="dc-foto">
              <Link
                to="/nommi/$id"
                params={{ id: k.userId }}
                className="dc-foto-link"
                aria-label={"Ver o nommi de " + k.nome}
              />
              <FotoMini k={k} />
              <span className="dc-foto-sombra" aria-hidden="true" />
              <div className="dc-info">
                <h2 className="dc-nome">
                  <Link to="/nommi/$id" params={{ id: k.userId }}>
                    {k.nome}
                  </Link>
                </h2>
                <p className="dc-cidade">
                  <Icon name="pin" />
                  {k.cidade || "Brasil"}
                  {k.tribosEmComum.length > 0 &&
                    ` · ${k.tribosEmComum.length} ${k.tribosEmComum.length === 1 ? "tribo" : "tribos"} em comum`}
                </p>
                {k.interesses.length > 0 && (
                  <div className="dc-tags">
                    {k.interesses.slice(0, 3).map((i) => (
                      <span key={i}>
                        <Icon name={iconeDoInteresse(i)} />
                        {i}
                      </span>
                    ))}
                  </div>
                )}
                <Link to="/conversas/$id" params={{ id: k.userId }} className="dc-conectar">
                  <Icon name="chat" />
                  Conversar
                </Link>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );

  const trilhoMinhasTribos = <TrilhoMinhasTribos me={me} />;
  const bannerTribos = <BannerTribos />;

  /** "O que estou procurando": filtro no servidor (0064), vale mesmo com a fila vazia. */
  const faixaProcurando = (
    <div className="dc-filtros dc-filtros-procurando" role="group" aria-label="Filtrar pelo que a pessoa procura">
      {OPCOES_PROCURANDO.map((o) => (
        <button
          key={o}
          type="button"
          className={"dc-chip" + (filtroProcurando === o ? " selected" : "")}
          onClick={() => setFiltroProcurando(filtroProcurando === o ? null : o)}
        >
          {o}
        </button>
      ))}
    </div>
  );

  const faixaFiltros = opcoesFiltro.length > 1 && (
    <div className="dc-filtros" role="group" aria-label="Filtrar por interesse">
      <button
        type="button"
        className={"dc-chip" + (filtro === null ? " selected" : "")}
        onClick={() => setFiltro(null)}
      >
        Todas
      </button>
      {opcoesFiltro.map((i) => (
        <button
          key={i}
          type="button"
          className={"dc-chip" + (filtro === i ? " selected" : "")}
          onClick={() => setFiltro(filtro === i ? null : i)}
        >
          <ChipIcone i={i} />
          {i}
        </button>
      ))}
    </div>
  );

  if (!c)
    return (
      <div ref={telaRef}>
        {comemoracao}
        {faixaProcurando}
        {/* Sem cartas, a explicação vem PRIMEIRO. Antes a pessoa rolava tribos,
          banner e conexões inteiros antes de descobrir por que não havia
          ninguém — e no Descobrir, onde a promessa é conhecer gente, isso lê
          como se o app tivesse quebrado. */}
        <EmptyState
          title={
            doDia && doDia.restantes === 0
              ? "Suas apresentações de hoje acabaram."
              : "Você conheceu todo mundo de hoje."
          }
          text={
            doDia && doDia.restantes === 0 ? fraseTetoDePerfis(doDia.pro) : "Amanhã a nommi te apresenta gente nova."
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
              Convidar alguém
            </Link>
          </Button>
          <Button asChild variant="secondary">
            <Link to="/grupos">Entrar numa tribo</Link>
          </Button>
        </EmptyState>
        {trilhoConhecidas}
        {trilhoMinhasTribos}
        {bannerTribos}
      </div>
    );

  return (
    <section className="combinar dc-combinar" ref={telaRef}>
      {comemoracao}
      {faixaProcurando}
      {faixaFiltros}

      {curiosidade > 0 && (
        <p className="combinar-curiosidade">
          <Icon name="eye" />
          {curiosidade === 1
            ? "1 pessoa já disse que quer te conhecer"
            : `${curiosidade} pessoas já disseram que querem te conhecer`}
        </p>
      )}

      {/* Carrossel de pessoas com profundidade: a carta do centro é maior,
          as vizinhas entram inclinadas e mais baixas (mockup da Ju 02/11).
          Conectar sai no coração ou na barra branca; o X passa para a próxima. */}
      <div className="dc-carrossel" role="list" aria-label="Pessoas que podem combinar com você">
        {vista.map((pessoa) => {
          const listaP = interessesOrdenados(pessoa);
          const tagsP = listaP.slice(0, 3);
          return (
            <article key={pessoa.userId} className="dc-pessoa" role="listitem">
              <div className="dc-foto">
                <Link
                  to="/nommi/$id"
                  params={{ id: pessoa.userId }}
                  className="dc-foto-link"
                  aria-label={"Ver o nommi de " + pessoa.nome}
                />
                <Face c={pessoa} size={320} />
                <span className="dc-foto-sombra" aria-hidden="true" />
                <div className="dc-topo-esq">
                  <button
                    type="button"
                    className="dc-x"
                    aria-label={"Agora não, " + pessoa.nome}
                    onClick={() => void decidir(pessoa, false)}
                  >
                    <Icon name="close" />
                  </button>
                  <SafetyMenu me={me} targetUserId={pessoa.userId} targetUserName={pessoa.nome} />
                </div>
                <button
                  type="button"
                  className="dc-coracao"
                  aria-label={"Quero conhecer " + pessoa.nome}
                  onClick={() => void decidir(pessoa, true)}
                >
                  <Icon name="heart" />
                </button>
                {pessoa.online && (
                  <span className="dc-agora" title="Está na nommi agora">
                    <i aria-hidden="true" />
                    agora
                  </span>
                )}
                <div className="dc-info">
                  <h2 className="dc-nome">
                    <Link to="/nommi/$id" params={{ id: pessoa.userId }}>
                      {pessoa.nome}
                      {/* Idade só aparece se a pessoa escolheu mostrar. Quando
                          não escolheu, o banco devolve null e não falta nada na
                          carta: é a resposta dela, não um dado ausente. */}
                      {pessoa.idade ? `, ${pessoa.idade}` : ""}
                    </Link>
                    {pessoa.verificada && (
                      <span className="selo-verificada" title="Perfil conferido pela nommi">
                        <Icon name="check" />
                      </span>
                    )}
                  </h2>
                  <p className="dc-cidade">
                    <Icon name="pin" />
                    {pessoa.cidade || "Brasil"}
                    {pessoa.estado ? ` - ${pessoa.estado}` : ""}
                    {pessoa.tribosEmComum > 0 &&
                      ` · ${pessoa.tribosEmComum} ${pessoa.tribosEmComum === 1 ? "tribo" : "tribos"} em comum`}
                  </p>
                  {pessoa.estadoCivil && (
                    <p className="dc-civil">
                      <span aria-hidden="true">{iconeEstadoCivil(pessoa.estadoCivil)}</span>
                      {rotuloEstadoCivil(pessoa.estadoCivil)}
                    </p>
                  )}
                  {pessoa.procurandoTags.length > 0 && (
                    <p className="dc-procurando">
                      <Icon name="spark" />
                      Procuro: {pessoa.procurandoTags.slice(0, 2).join(" · ")}
                    </p>
                  )}
                  {tagsP.length > 0 && (
                    <div className="dc-tags">
                      {tagsP.map((i) => (
                        <span key={i.nome} className={i.comum ? "comum" : ""}>
                          <Icon name={iconeDoInteresse(i.nome)} />
                          {i.nome}
                        </span>
                      ))}
                    </div>
                  )}
                  <button type="button" className="dc-conectar" onClick={() => void decidir(pessoa, true)}>
                    <Icon name="users" />
                    Conectar
                  </button>
                </div>
              </div>
            </article>
          );
        })}
      </div>

      {trilhoMinhasTribos}
      {bannerTribos}
      {trilhoConhecidas}
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
