import { useEffect, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import {
  COMO_FUNCIONA,
  ETAPAS,
  TOTAL_DE_PASSOS,
  progresso,
  recadoDaPrivacidade,
  recadoDoFim,
  respostasParaSalvar,
  type Etapa,
} from "@/lib/apresentacao";
import { Icon } from "./art";

/** profiles.apresentacao ainda não está em types.ts. */
const db = supabase as unknown as SupabaseClient;

/**
 * A apresentação, em passos curtos. Uma pergunta por tela, com barra de
 * progresso e "pular" sempre à mão. No fim, explica como as pessoas se
 * encontram aqui — que foi exatamente o que faltou para a testadora.
 */
export function Apresentacao({ me, aoFechar }: { me: string; aoFechar: () => void }) {
  const [passo, setPasso] = useState(0);
  const [respostas, setRespostas] = useState<Partial<Record<Etapa["chave"], string>>>({});
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");

  // Quem já contou algo em Meu nommi não recomeça do zero: as respostas
  // guardadas aparecem preenchidas, prontas para confirmar ou mudar.
  useEffect(() => {
    let vivo = true;
    void (async () => {
      const { data } = await db
        .from("profiles")
        .select("about,looking_for,topa,nao_topa")
        .eq("id", me)
        .maybeSingle();
      if (!vivo || !data) return;
      const p = data as Record<string, string | null>;
      setRespostas((r) => {
        const novo = { ...r };
        if (!novo.historia && p["about"]) novo.historia = p["about"];
        if (!novo.procura && p["looking_for"]) novo.procura = p["looking_for"];
        if (!novo.topa && p["topa"]) novo.topa = p["topa"];
        if (!novo.naoTopa && p["nao_topa"]) novo.naoTopa = p["nao_topa"];
        return novo;
      });
    })();
    return () => {
      vivo = false;
    };
  }, [me]);

  const etapa = ETAPAS[passo];
  const noFim = passo >= ETAPAS.length;

  async function encerrar(comoFoi: "feita" | "pulou") {
    setSalvando(true);
    const campos = respostasParaSalvar(respostas);
    setErro("");
    const { error } = await db
      .from("profiles")
      .update({ ...campos, apresentacao: comoFoi })
      .eq("id", me);
    setSalvando(false);
    if (error) {
      // Sem isso, a tela fechava como se tivesse salvo e pedia tudo de novo.
      setErro("Não deu para guardar agora. Confira a internet e tente de novo.");
      return;
    }
    aoFechar();
  }

  return (
    <div className="apresentacao" role="dialog" aria-modal="true" aria-labelledby="apres-titulo">
      <div className="apresentacao-cartao">
        <div className="apresentacao-barra" aria-hidden="true">
          <span style={{ width: progresso(passo + 1) + "%" }} />
        </div>

        {noFim ? (
          <>
            <h2 id="apres-titulo">{recadoDoFim(respostas)}</h2>
            <p className="apresentacao-sub">E é assim que as pessoas se acham por aqui:</p>
            <div className="apresentacao-como">
              {COMO_FUNCIONA.map((c) => (
                <article key={c.titulo}>
                  <h3>{c.titulo}</h3>
                  <p>{c.texto}</p>
                </article>
              ))}
            </div>
            <Button className="wide" disabled={salvando} onClick={() => void encerrar("feita")}>
              {salvando ? "Guardando…" : "Bora começar"}
              <Icon name="arrow" />
            </Button>
          </>
        ) : (
          etapa && (
            <>
              <p className="apresentacao-passo">
                {passo + 1} de {TOTAL_DE_PASSOS}
              </p>
              <h2 id="apres-titulo">{etapa.titulo}</h2>
              <p className="apresentacao-sub">{etapa.ajuda}</p>
              <textarea
                className="input"
                rows={etapa.linhas}
                maxLength={etapa.max}
                value={respostas[etapa.chave] ?? ""}
                placeholder={etapa.exemplo}
                onChange={(e) =>
                  setRespostas((r) => ({ ...r, [etapa.chave]: e.target.value }))
                }
              />
              <p className={"apresentacao-onde " + etapa.onde}>
                <Icon name={etapa.onde === "pagina" ? "eye" : "lock"} />
                {recadoDaPrivacidade(etapa.onde)}
              </p>
              <div className="apresentacao-acoes">
                <Button variant="ghost" onClick={() => setPasso((p) => p + 1)}>
                  Pular
                </Button>
                <Button onClick={() => setPasso((p) => p + 1)}>
                  Continuar
                  <Icon name="arrow" />
                </Button>
              </div>
            </>
          )
        )}

        {erro && (
          <p role="alert" className="form-error">
            {erro}
          </p>
        )}
        <button
          type="button"
          className="apresentacao-depois"
          disabled={salvando}
          onClick={() => void encerrar("pulou")}
        >
          Deixar para depois
        </button>
      </div>
    </div>
  );
}
