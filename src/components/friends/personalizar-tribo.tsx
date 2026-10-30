import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useFriends } from "@/components/friends/store";
import {
  FIGURINHAS_DE_TRIBO,
  LIMITES,
  desenhoDaFigurinha,
  linkDaTribo,
  podeTerLinkPublico,
  recadoDaIdentidade,
  recadoDeQuemCria,
  recadoDoLink,
  salvarPersonalizacao,
  textoDeDivulgacao,
  type Personalizacao,
} from "@/lib/tribo-da-dona";
import { Icon } from "./art";

/**
 * Personalizar a tribo. Só quem criou chega aqui.
 *
 * A ordem das partes é a ordem em que a dona pensa: primeiro o que a tribo é
 * (sobre, missão, valores, visão), depois a cara dela (figurinha), depois as
 * regras de convivência, depois quem faz o quê, e por último o link.
 *
 * Tudo é opcional, e a tela diz isso. Tribo sem missão escrita funciona igual;
 * quem quiser escrever três parágrafos sobre os valores também pode.
 */
export function PersonalizarTribo({
  id,
  nome,
  cidade,
  sensivel,
  inicial,
  aoSalvar,
}: {
  id: number;
  nome: string;
  cidade: string;
  sensivel: boolean;
  inicial: Personalizacao;
  aoSalvar?: (p: Personalizacao) => void;
}) {
  const { notify } = useFriends();
  const [p, setP] = useState<Personalizacao>(inicial);
  const [salvando, setSalvando] = useState(false);
  const [grupo, setGrupo] = useState(FIGURINHAS_DE_TRIBO[0]?.grupo ?? "");

  const campo = (k: keyof Personalizacao) => (v: string) => setP((a) => ({ ...a, [k]: v }));
  const grupos = [...new Set(FIGURINHAS_DE_TRIBO.map((f) => f.grupo))];
  const link = linkDaTribo(window.location.origin, id);

  async function salvar() {
    setSalvando(true);
    const { ok, arrumada } = await salvarPersonalizacao(id, p);
    setSalvando(false);
    if (!ok) {
      notify("Não deu para salvar agora. Tente de novo.");
      return;
    }
    setP(arrumada);
    aoSalvar?.(arrumada);
    notify("Tribo salva.");
  }

  return (
    <section className="tribo-dona">
      <header>
        <h2 className="settings-subtitle">Sua tribo</h2>
        <p className="small-note">{recadoDaIdentidade(p)}</p>
      </header>

      <label>
        Do que é essa tribo
        <textarea
          className="input"
          rows={4}
          maxLength={LIMITES.sobre}
          value={p.about}
          placeholder="Ex.: Mulheres que gostam de café e conversa boa, sem pressa."
          onChange={(e) => campo("about")(e.target.value)}
        />
        <small className="muted">É o que aparece para quem está decidindo entrar.</small>
      </label>

      <label>
        Missão
        <textarea
          className="input"
          rows={3}
          maxLength={LIMITES.missao}
          value={p.missao}
          placeholder="Ex.: Fazer com que nenhuma mulher da região passe o fim de semana sozinha."
          onChange={(e) => campo("missao")(e.target.value)}
        />
      </label>

      <label>
        Valores
        <textarea
          className="input"
          rows={3}
          maxLength={LIMITES.valores}
          value={p.valores}
          placeholder="Ex.: Escuta sem julgamento. Ninguém fica de fora. O que é dito aqui fica aqui."
          onChange={(e) => campo("valores")(e.target.value)}
        />
      </label>

      <label>
        Visão
        <textarea
          className="input"
          rows={3}
          maxLength={LIMITES.visao}
          value={p.visao}
          placeholder="Ex.: Ser a tribo onde quem chegou na cidade encontra as primeiras amigas."
          onChange={(e) => campo("visao")(e.target.value)}
        />
      </label>

      <div className="tribo-fig">
        <b>A cara da tribo</b>
        <p className="small-note">
          A figurinha aparece do lado do nome, na lista e na página da tribo.
          {p.figurinha ? "" : " Nenhuma escolhida."}
        </p>
        <div className="chips">
          {grupos.map((g) => (
            <Button
              key={g}
              variant="ghost"
              type="button"
              className={"chip" + (g === grupo ? " active" : "")}
              aria-pressed={g === grupo}
              onClick={() => setGrupo(g)}
            >
              {g}
            </Button>
          ))}
        </div>
        <div className="fig-grade" role="listbox" aria-label="Figurinhas">
          {p.figurinha && (
            <Button
              variant="ghost"
              type="button"
              className="fig-item tirar"
              onClick={() => campo("figurinha")("")}
              aria-label="Tirar a figurinha"
            >
              <span aria-hidden="true">
                <Icon name="close" />
              </span>
            </Button>
          )}
          {FIGURINHAS_DE_TRIBO.filter((f) => f.grupo === grupo).map((f) => (
            <Button
              key={f.nome}
              variant="ghost"
              type="button"
              role="option"
              aria-selected={f.nome === p.figurinha}
              aria-label={f.nome}
              className={"fig-item" + (f.nome === p.figurinha ? " marcada" : "")}
              onClick={() => campo("figurinha")(f.nome)}
            >
              <span aria-hidden="true">{f.fig}</span>
            </Button>
          ))}
        </div>
      </div>

      <label>
        As regras daqui
        <textarea
          className="input"
          rows={5}
          maxLength={LIMITES.regra}
          value={p.rule}
          placeholder={"Ex.:\nAviso se não for poder ir.\nNada de foto de ninguém sem permissão.\nQuem chega é recebida."}
          onChange={(e) => campo("rule")(e.target.value)}
        />
        <small className="muted">
          Quem entra lê as regras. Você pode remover alguém que não respeita.
        </small>
      </label>

      <div className="tribo-quem">
        <b>Quem marca rolê</b>
        <div className="chips">
          {(["todos", "criadora"] as const).map((q) => (
            <Button
              key={q}
              variant="ghost"
              type="button"
              className={"chip" + (q === p.who_roles ? " active" : "")}
              aria-pressed={q === p.who_roles}
              onClick={() => setP((a) => ({ ...a, who_roles: q }))}
            >
              {q === "todos" ? "Qualquer uma" : "Só eu"}
            </Button>
          ))}
        </div>
        <p className="small-note">{recadoDeQuemCria(p.who_roles)}</p>
      </div>

      <div className="tribo-quem">
        <b>Quem escreve na tribo</b>
        <div className="chips">
          {(["todos", "criadora"] as const).map((q) => (
            <Button
              key={q}
              variant="ghost"
              type="button"
              className={"chip" + (q === p.who_posts ? " active" : "")}
              aria-pressed={q === p.who_posts}
              onClick={() => setP((a) => ({ ...a, who_posts: q }))}
            >
              {q === "todos" ? "Qualquer uma" : "Só eu"}
            </Button>
          ))}
        </div>
      </div>

      <div className={"tribo-link" + (p.link_publico ? " no-ar" : "")}>
        <b>O link da tribo</b>
        <p className="small-note">{recadoDoLink(sensivel, p.link_publico)}</p>
        {podeTerLinkPublico(sensivel) && (
          <>
            <Button
              variant={p.link_publico ? "secondary" : "outline"}
              type="button"
              className="wide"
              onClick={() => setP((a) => ({ ...a, link_publico: !a.link_publico }))}
            >
              <Icon name="link" />
              {p.link_publico ? "Desligar a página da tribo" : "Ligar a página da tribo"}
            </Button>
            {p.link_publico && (
              <>
                <code className="tribo-endereco">{link}</code>
                <Button
                  variant="ghost"
                  type="button"
                  className="wide"
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(
                        textoDeDivulgacao(nome, cidade, link),
                      );
                      notify("Convite copiado. Cole onde você quiser.");
                    } catch {
                      notify("Não deu para copiar aqui. Selecione o endereço acima.");
                    }
                  }}
                >
                  <Icon name="send" />
                  Copiar o texto para divulgar
                </Button>
              </>
            )}
          </>
        )}
      </div>

      <Button className="wide" disabled={salvando} onClick={() => void salvar()}>
        {salvando ? "Salvando…" : "Salvar a tribo"}
      </Button>
      {p.figurinha && (
        <p className="small-note">
          Vai aparecer assim: <b>{desenhoDaFigurinha(p.figurinha)} {nome}</b>
        </p>
      )}
    </section>
  );
}
