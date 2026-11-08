import { useEffect, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { COMO_FUNCIONA } from "@/lib/apresentacao";
import { OPCOES_PROCURANDO } from "@/lib/combinar";
import { OPCOES_ESTADO_CIVIL, UFS, iconeEstadoCivil } from "@/lib/pagina-pessoal";
import { enviarFotoDePerfil } from "@/lib/foto-perfil";
import { saveCloudProfile } from "@/lib/real-profiles";
import { FotoInstantanea } from "./foto-instantanea";
import { Icon } from "./art";
import rioPhoto from "@/assets/welcome-rio.jpg";
import { RASCUNHO_CADASTRO_KEY, type RascunhoCadastro } from "./cadastro";
import "./cadastro.css";

/** profiles.dicas/religiao/politica ainda não estão em types.ts. */
const db = supabase as unknown as SupabaseClient;

/**
 * A continuação do cadastro, no primeiro acesso depois de confirmar o e-mail
 * (decisão da Ju, 07/11): foto, cidade + UF, o que está procurando, estado
 * civil e o "como funciona". Uma pergunta por tela, tudo pulável menos a
 * vontade de ficar.
 *
 * Aqui também entra o rascunho que o cadastro guardou em localStorage antes
 * da conta existir: celular, interesses, religião, política e dicas.
 * Religião e política só são gravadas se a pessoa escolheu uma opção —
 * "Prefiro não dizer" nem chega a virar dado.
 */
/** Rótulos do estado civil no formato decidido pela Ju (07/11 22:26): sem
 *  "recomeçando" e sem floreio. O lib ainda tem os rótulos antigos — quando o
 *  Claude atualizar rotuloEstadoCivil, esta tela volta a usar a função dele. */
const ROTULO_CIVIL: Record<string, string> = {
  solteira: "Solteiro(a)",
  casada: "Casado(a)",
  comprometida: "Comprometido(a)",
  divorciada: "Divorciado(a)",
};

export function BoasVindas({ me, aoFechar }: { me: string; aoFechar: () => void }) {
  const [passo, setPasso] = useState(0);
  const [rascunho, setRascunho] = useState<RascunhoCadastro | null>(null);
  const [fotoOk, setFotoOk] = useState(false);
  const [fotoErro, setFotoErro] = useState("");
  const [cidade, setCidade] = useState("");
  const [uf, setUf] = useState("");
  const [procurando, setProcurando] = useState<string[]>([]);
  const [civil, setCivil] = useState("");
  const [mostrarCivil, setMostrarCivil] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");

  const TOTAL = 5;

  useEffect(() => {
    try {
      const bruto = localStorage.getItem(RASCUNHO_CADASTRO_KEY);
      if (bruto) setRascunho(JSON.parse(bruto) as RascunhoCadastro);
    } catch {
      // Sem rascunho, segue o baile: as telas perguntam o essencial de novo.
    }
  }, []);

  function avancar() {
    setErro("");
    setPasso((p) => Math.min(p + 1, TOTAL - 1));
  }

  const alternaTag = (t: string) =>
    setProcurando((atual) =>
      atual.includes(t) ? atual.filter((x) => x !== t) : atual.length < 3 ? [...atual, t] : atual,
    );

  async function encerrar(comoFoi: "feita" | "pulou") {
    setSalvando(true);
    setErro("");
    const campos: Record<string, unknown> = { apresentacao: comoFoi };
    if (cidade.trim()) campos["city"] = cidade.trim();
    if (uf) campos["estado"] = uf;
    if (procurando.length) campos["procurando"] = procurando;
    if (civil) {
      campos["estado_civil"] = civil;
      campos["mostrar_estado_civil"] = mostrarCivil;
    }
    if (rascunho) {
      if (rascunho.celular) campos["celular"] = rascunho.celular;
      if (rascunho.interesses?.length) campos["interests"] = rascunho.interesses;
    }
    const { error } = await db.from("profiles").update(campos).eq("id", me);
    if (error) {
      setSalvando(false);
      setErro("Não deu para guardar agora. Confira a internet e tente de novo.");
      return;
    }
    // Os campos novos da 0067 (religião, política, dicas) ficam num update à
    // parte: se a migração ainda não foi aplicada, o essencial já está salvo
    // e nada quebra. Quando o Claude aplicar, passa a gravar.
    if (rascunho && (rascunho.religiao || rascunho.politica || rascunho.dicas?.length)) {
      const sensiveis: Record<string, unknown> = {};
      if (rascunho.religiao) sensiveis["religiao"] = rascunho.religiao;
      if (rascunho.politica) sensiveis["politica"] = rascunho.politica;
      if (rascunho.dicas?.length) sensiveis["dicas"] = rascunho.dicas;
      await db.from("profiles").update(sensiveis).eq("id", me);
    }
    try {
      localStorage.removeItem(RASCUNHO_CADASTRO_KEY);
    } catch {
      // Limpeza best-effort.
    }
    setSalvando(false);
    aoFechar();
  }

  return (
    <div className="apresentacao com-cenario bv-palco" role="dialog" aria-modal="true" aria-labelledby="bv-titulo">
      <div className="cenario-fundo" aria-hidden="true" style={{ backgroundImage: `url(${rioPhoto})` }} />
      <div className="cenario-veu" aria-hidden="true" />
      <div className="cenario-brilhos" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>
      <div className="cenario-conteudo bv-conteudo">
        <div className="cd-barra" aria-hidden="true">
          <span style={{ width: Math.round(((passo + 1) / TOTAL) * 100) + "%" }} />
        </div>
        <p className="cd-passo">
          {passo + 1} de {TOTAL}
        </p>

        {passo === 0 && (
          <section className="cd-tela">
            <h2 id="bv-titulo">Só falta a sua foto.</h2>
            <p className="cd-sub">
              Na nommi, quem procura amizade precisa ver quem você é. A sua aparece só para quem
              está aqui pelo mesmo motivo.
            </p>
            <FotoInstantanea
              rotulo="Enviar minha foto"
              onPronta={async (jpeg) => {
                setFotoErro("");
                const caminho = await enviarFotoDePerfil(me, jpeg);
                const ok = await saveCloudProfile(me, { avatar_url: caminho ?? jpeg });
                if (ok) {
                  setFotoOk(true);
                  avancar();
                } else setFotoErro("Não deu para salvar agora. Tenta de novo?");
              }}
            />
            {fotoErro && (
              <p role="alert" className="form-error">
                {fotoErro}
              </p>
            )}
            <div className="cd-acoes">
              <Button variant="ghost" onClick={avancar}>
                Agora não
              </Button>
              {fotoOk && (
                <Button onClick={avancar}>
                  Continuar
                  <Icon name="arrow" />
                </Button>
              )}
            </div>
          </section>
        )}

        {passo === 1 && (
          <section className="cd-tela">
            <h2 id="bv-titulo">Onde você está?</h2>
            <p className="cd-sub">É assim que a nommi mostra gente e rolês perto de você.</p>
            <label className="cd-campo">
              Sua cidade
              <input
                className="input"
                maxLength={60}
                autoComplete="address-level2"
                placeholder="Ex.: Belo Horizonte"
                value={cidade}
                onChange={(e) => setCidade(e.target.value)}
              />
            </label>
            <label className="cd-campo">
              Seu estado (UF)
              <select className="input" value={uf} onChange={(e) => setUf(e.target.value)}>
                <option value="">Escolher</option>
                {UFS.map((u) => (
                  <option key={u} value={u}>
                    {u}
                  </option>
                ))}
              </select>
            </label>
            <div className="cd-acoes">
              <Button variant="ghost" onClick={avancar}>
                Pular
              </Button>
              <Button disabled={!cidade.trim()} onClick={avancar}>
                Continuar
                <Icon name="arrow" />
              </Button>
            </div>
          </section>
        )}

        {passo === 2 && (
          <section className="cd-tela">
            <h2 id="bv-titulo">O que você está procurando?</h2>
            <p className="cd-sub">Aparece no seu cartão e vira filtro no Descobrir. Até 3.</p>
            <div className="cd-grade">
              {OPCOES_PROCURANDO.map((o) => (
                <button
                  key={o}
                  type="button"
                  className={"cd-chip" + (procurando.includes(o) ? " marcada" : "")}
                  aria-pressed={procurando.includes(o)}
                  onClick={() => alternaTag(o)}
                >
                  {o}
                </button>
              ))}
            </div>
            <div className="cd-acoes">
              <Button variant="ghost" onClick={avancar}>
                Pular
              </Button>
              <Button onClick={avancar}>
                Continuar
                <Icon name="arrow" />
              </Button>
            </div>
          </section>
        )}

        {passo === 3 && (
          <section className="cd-tela">
            <h2 id="bv-titulo">Estado civil?</h2>
            <p className="cd-sub">Opcional. Se contar, você decide se aparece no seu cartão.</p>
            <div className="cd-lista" role="listbox" aria-label="Estado civil">
              {OPCOES_ESTADO_CIVIL.map((o) => (
                <button
                  type="button"
                  key={o}
                  className="cd-opcao"
                  onClick={() => {
                    setCivil(o);
                    avancar();
                  }}
                >
                  <span aria-hidden="true">{iconeEstadoCivil(o)}</span> {ROTULO_CIVIL[o] ?? o}
                </button>
              ))}
              <button
                type="button"
                className="cd-opcao cd-neutra"
                onClick={() => {
                  setCivil("");
                  avancar();
                }}
              >
                Prefiro não dizer
              </button>
            </div>
            <label className="checkbox-line">
              <input
                type="checkbox"
                checked={mostrarCivil}
                onChange={(e) => setMostrarCivil(e.target.checked)}
              />
              <span>Mostrar meu estado civil no meu cartão</span>
            </label>
          </section>
        )}

        {passo === 4 && (
          <section className="cd-tela">
            <h2 id="bv-titulo">É assim que as pessoas se acham por aqui:</h2>
            <div className="apresentacao-como">
              {COMO_FUNCIONA.map((c) => (
                <article key={c.titulo}>
                  <h3>{c.titulo}</h3>
                  <p>{c.texto}</p>
                </article>
              ))}
            </div>
            {erro && (
              <p role="alert" className="form-error">
                {erro}
              </p>
            )}
            <Button className="wide" disabled={salvando} onClick={() => void encerrar("feita")}>
              {salvando ? "Guardando…" : "Bora começar"}
              <Icon name="arrow" />
            </Button>
          </section>
        )}

        {passo < 4 && (
          <button
            type="button"
            className="apresentacao-depois"
            disabled={salvando}
            onClick={() => void encerrar("pulou")}
          >
            Deixar para depois
          </button>
        )}
      </div>
    </div>
  );
}
