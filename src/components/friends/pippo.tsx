/*
 * Origem das imagens do Pippo: personagem gerado e construído pela própria Ju.
 * Confirmado por ela em 02/11 às 14:13, com uso liberado como rosto da nommi.
 */
import "./pippo.css";
import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import frontalPippo from "@/assets/pippo/1-pippo-frontal.png";
import apontaPippo from "@/assets/pippo/1-pippo-aponta.png";
import { installSteps, isStandalone, platformOf } from "@/lib/install";
import { ativarAvisos, estadoDosAvisos } from "@/lib/push";
import { supabase } from "@/integrations/supabase/client";
import { TRIBO_DO_PIPPO_ID } from "@/lib/pippo-tribo";
import {
  BOAS_VINDAS_DO_PIPPO,
  boasVindasAtivas,
  respostaDeInstalar,
  indicarTribo,
  COMECO_DO_PIPPO,
  NAO_SEI_DO_PIPPO,
  RESPOSTAS_DO_PIPPO,
  baloes,
  papoPara,
  respostaPara,

  respostaPorId,
  type RespostaDoPippo,
} from "@/lib/pippo-respostas";
import { climaAgora, dolarAgora, perguntaDeDados } from "@/lib/pippo-dados";
import type { PerguntaDeDados } from "@/lib/pippo-dados";

/** O Pippo de frente, recortado, com fundo transparente. Usado no cantinho e no tour. */
export { frontalPippo };

export function PippoRosto({ altura = 92 }: { altura?: number }) {
  return <img className="pippo-busto" src={frontalPippo} alt="" style={{ height: altura }} />;
}

type Fala = {
  de: "pippo" | "voce";
  texto: string;
  ir?: RespostaDoPippo["ir"];
  irTribo?: { id: number; rotulo: string };
  acao?: "ativar-avisos" | undefined;
};

const CHAVE = "nommi-pippo-conversa";
const COMECO: Fala[] = BOAS_VINDAS_DO_PIPPO.map((texto) => ({ de: "pippo", texto }));

function lerSessao(): { falas: Fala[]; sugestoes: string[] } {
  try {
    const bruto = window.sessionStorage.getItem(CHAVE);
    if (bruto) {
      const d = JSON.parse(bruto);
      if (Array.isArray(d.falas) && Array.isArray(d.sugestoes)) return d;
    }
  } catch {
    /* sem armazenamento: a conversa vale só até fechar a aba */
  }
  return { falas: COMECO, sugestoes: COMECO_DO_PIPPO };
}

/** Ajudante fixo no cantinho: conversa com respostas prontas e refaz o tour. */
export function PippoAjudante({
  aoRefazerTour,
  me,
  nome,
}: {
  aoRefazerTour: () => void;
  me?: string;
  nome?: string;
}) {
  const [novidade, setNovidade] = useState(false);
  const [aberto, setAberto] = useState(false);
  const [falas, setFalas] = useState<Fala[]>(COMECO);
  const [sugestoes, setSugestoes] = useState<string[]>(COMECO_DO_PIPPO);
  const [digitando, setDigitando] = useState(false);
  const [texto, setTexto] = useState("");
  const [todas, setTodas] = useState(false);
  const fim = useRef<HTMLDivElement>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    const d = lerSessao();
    setFalas(d.falas);
    setSugestoes(d.sugestoes);
    const t = timers.current;
    return () => t.forEach(clearTimeout);
  }, []);

  // Boas-vindas ativas: uma vez por conta, o Pippo chega falando e indica uma tribo real.
  useEffect(() => {
    if (!me) return;
    const marca = "nommi-pippo-boasvindas-" + me;
    try {
      if (window.localStorage.getItem(marca)) return;
    } catch {
      return;
    }
    let vivo = true;
    void supabase.rpc("tribos_para_mim", { _limite: 6 }).then(({ data }) => {
      if (!vivo) return;
      const lista = (
        (data as
          | { id: number; name: string; member_count: number; i_am_member: boolean; em_comum: number }[]
          | null) ?? []
      ).map((r) => ({
        id: r.id,
        name: r.name,
        members: r.member_count,
        iAmMember: r.i_am_member,
        emComum: r.em_comum,
      }));
      const tribo = indicarTribo(lista, TRIBO_DO_PIPPO_ID);
      const msgs = boasVindasAtivas(nome ?? "", tribo);
      setFalas((f) => [
        ...f,
        ...msgs.map((texto, i): Fala => {
          const fala: Fala = { de: "pippo", texto };
          if (tribo && i === msgs.length - 1)
            fala.irTribo = { id: tribo.id, rotulo: "Ver a tribo " + tribo.name };
          return fala;
        }),
      ]);
      setNovidade(true);
    });
    return () => {
      vivo = false;
    };
  }, [me, nome]);

  // Recado único dos avisos: vale para quem já usava o app antes deles existirem.
  // Instalado e sem decisão: oferece o botão. Não instalado: ensina a instalar.
  // Já ligado, negado ou sem suporte: não incomoda.
  useEffect(() => {
    if (!me) return;
    const marca = "nommi-pippo-avisos-" + me;
    try {
      if (window.localStorage.getItem(marca)) return;
      window.localStorage.setItem(marca, "1");
    } catch {
      return;
    }
    const instalado = isStandalone(window as Parameters<typeof isStandalone>[0]);
    const estado = estadoDosAvisos();
    let falasNovas: Fala[];
    if (instalado && estado === "disponivel") {
      falasNovas = [
        { de: "pippo", texto: "Novidade: agora eu te aviso quando chegar coisa nova por aqui." },
        { de: "pippo", texto: "É um toque só, e você desliga quando quiser.", acao: "ativar-avisos" },
      ];
    } else if (!instalado) {
      const plataforma = platformOf(navigator.userAgent, navigator.maxTouchPoints);
      falasNovas = [
        { de: "pippo", texto: "Novidade: agora eu consigo te avisar quando chegar coisa nova." },
        {
          de: "pippo",
          texto: "Para receber os avisos, primeiro coloca a nommi na sua tela inicial:",
        },
        ...respostaDeInstalar(plataforma, false, installSteps(plataforma)).map(
          (texto): Fala => ({ de: "pippo", texto }),
        ),
      ];
    } else {
      return;
    }
    setFalas((f) => [...f, ...falasNovas]);
    setNovidade(true);
  }, [me]);

  useEffect(() => {
    if (!aberto || !novidade || !me) return;
    setNovidade(false);
    try {
      window.localStorage.setItem("nommi-pippo-boasvindas-" + me, "1");
    } catch {
      /* ok */
    }
  }, [aberto, novidade, me]);

  useEffect(() => {
    try {
      window.sessionStorage.setItem(CHAVE, JSON.stringify({ falas, sugestoes }));
    } catch {
      /* ok */
    }
  }, [falas, sugestoes]);

  useEffect(() => {
    fim.current?.scrollIntoView({ block: "end" });
  }, [falas, digitando, aberto]);

  const responder = (pergunta: string, r: RespostaDoPippo | null) => {
    setFalas((f) => [...f, { de: "voce", texto: pergunta }]);
    setSugestoes([]);
    setTodas(false);
    setDigitando(true);
    let baloesDele: string[];
    let ir: RespostaDoPippo["ir"];
    let depois: string[];
    let acaoFinal: Fala["acao"];
    const papo = r ? null : papoPara(pergunta);
    if (r && r.id === "avisos") {
      const instalado = isStandalone(window as Parameters<typeof isStandalone>[0]);
      const estado = estadoDosAvisos();
      const plataforma = platformOf(navigator.userAgent, navigator.maxTouchPoints);
      if (!instalado) {
        baloesDele = [
          r.abre,
          "Primeiro instala a nommi na tela inicial, que aí eu consigo te avisar.",
          ...respostaDeInstalar(plataforma, false, installSteps(plataforma)),
        ];
      } else if (estado === "ativo") {
        baloesDele = [r.abre, "Seus avisos já estão ligados. Pode deixar que eu te chamo."];
      } else if (estado === "negado") {
        baloesDele = [
          r.abre,
          "Os avisos estão desligados no seu aparelho. Para ligar, abra os ajustes, em Notificações, e libere a nommi.",
        ];
      } else if (estado === "disponivel") {
        baloesDele = [r.abre, "É um toque só: ativa aqui embaixo e eu te aviso quando chegar coisa nova."];
        acaoFinal = "ativar-avisos";
      } else {
        baloesDele = [r.abre, "Esse navegador não tem avisos. No celular, com a nommi instalada, eu te chamo."];
      }
      depois = r.depois;
    } else if (r && r.id === "instalar") {
      baloesDele = [
        r.abre,
        ...respostaDeInstalar(
          platformOf(navigator.userAgent, navigator.maxTouchPoints),
          isStandalone(window as Parameters<typeof isStandalone>[0]),
          installSteps(platformOf(navigator.userAgent, navigator.maxTouchPoints)),
        ),
      ];
      depois = r.depois;
    } else if (r) {
      baloesDele = [r.abre, ...baloes(r.resposta)];
      ir = r.ir;
      depois = r.depois;
    } else if (papo) {
      baloesDele = papo;
      depois = COMECO_DO_PIPPO;
    } else {
      baloesDele = NAO_SEI_DO_PIPPO;
      ir = { to: "/ajuda", rotulo: "Abrir a Ajuda" };
      depois = COMECO_DO_PIPPO;
    }
    let espera = 650;
    baloesDele.forEach((b, i) => {
      const ultimo = i === baloesDele.length - 1;
      timers.current.push(
        setTimeout(() => {
          setFalas((f) => [
            ...f,
            { de: "pippo", texto: b, ir: ultimo ? ir : undefined, acao: ultimo ? acaoFinal : undefined },
          ]);
          if (ultimo) {
            setDigitando(false);
            setSugestoes(depois);
          } else setDigitando(true);
        }, espera),
      );
      espera += 500 + Math.min(900, b.length * 14);
    });
  };

  const responderComDados = (pergunta: string, dados: PerguntaDeDados) => {
    setFalas((f) => [...f, { de: "voce", texto: pergunta }]);
    setSugestoes([]);
    setTodas(false);
    setDigitando(true);
    const busca = dados.tipo === "dolar" ? dolarAgora() : climaAgora(dados.cidade);
    void busca.then((baloesDele) => {
      let espera = 650;
      baloesDele.forEach((b, i) => {
        const ultimo = i === baloesDele.length - 1;
        timers.current.push(
          setTimeout(() => {
            setFalas((f) => [...f, { de: "pippo", texto: b }]);
            if (ultimo) {
              setDigitando(false);
              setSugestoes(COMECO_DO_PIPPO);
            } else setDigitando(true);
          }, espera),
        );
        espera += 500 + Math.min(900, b.length * 14);
      });
    });
  };

  const aoAtivarAvisos = () => {
    if (!me || digitando) return;
    setFalas((f) => [...f, { de: "voce", texto: "Ativar avisos" }]);
    setDigitando(true);
    void ativarAvisos(me).then((r) => {
      const texto =
        r === "ativo"
          ? "Pronto! Agora eu te aviso quando chegar coisa nova. Para desligar, é nas configurações de notificações do aparelho."
          : r === "negado"
            ? "Tudo bem, sem avisos por enquanto. Se mudar de ideia, é só me chamar aqui."
            : "Não consegui ligar agora. Tenta de novo daqui a pouquinho.";
      setFalas((f) => [...f, { de: "pippo", texto }]);
      setDigitando(false);
    });
  };

  const lista = todas ? RESPOSTAS_DO_PIPPO : sugestoes.map(respostaPorId).filter(Boolean);

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
                {f.irTribo && (
                  <Link
                    to="/grupos/$id"
                    params={{ id: String(f.irTribo.id) }}
                    className="pippo-ir"
                    onClick={() => setAberto(false)}
                  >
                    {f.irTribo.rotulo}
                  </Link>
                )}
                {f.ir && (
                  <Link to={f.ir.to} className="pippo-ir" onClick={() => setAberto(false)}>
                    {f.ir.rotulo}
                  </Link>
                )}
                {f.acao === "ativar-avisos" && estadoDosAvisos() === "disponivel" && (
                  <button type="button" className="pippo-ir" onClick={aoAtivarAvisos}>
                    Ativar avisos
                  </button>
                )}
              </div>
            ))}
            {digitando && (
              <div className="pippo-fala pippo digitando" aria-label="Pippo está digitando">
                <span />
                <span />
                <span />
              </div>
            )}
            <div ref={fim} />
          </div>
          <div className="pippo-perguntas">
            {!digitando &&
              (lista as RespostaDoPippo[]).map((r) => (
                <button key={r.id} type="button" onClick={() => responder(r.pergunta, r)}>
                  {r.pergunta}
                </button>
              ))}
            {!digitando && !todas && (
              <button type="button" onClick={() => setTodas(true)}>
                Ver todas as perguntas
              </button>
            )}
            {!digitando && (
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
            )}
          </div>
          <form
            className="pippo-escrever"
            onSubmit={(e) => {
              e.preventDefault();
              const t = texto.trim();
              if (!t || digitando) return;
              setTexto("");
              const dados = perguntaDeDados(t);
              if (dados) {
                responderComDados(t, dados);
                return;
              }
              responder(t, respostaPara(t));
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
        {novidade && !aberto && <span className="pippo-novidade" aria-label="Pippo tem uma novidade" />}
      </button>
    </div>
  );
}
