import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Icon } from "./art";
import { EmptyState } from "./surfaces";
import { useFriends } from "./store";
import { useModeracao, motivoEmPalavras, urgencia, type StatusDenuncia } from "@/lib/moderacao";
import { timeAgo } from "@/lib/posts";

const ABAS: { v: StatusDenuncia | "todas"; label: string }[] = [
  { v: "aberta", label: "Abertas" },
  { v: "analisada", label: "Analisadas" },
  { v: "arquivada", label: "Arquivadas" },
  { v: "todas", label: "Todas" },
];

/** A fila de denúncias: sem isto, denunciar não protege ninguém. */
export function Moderacao({ souAdmin }: { souAdmin: boolean }) {
  const { notify } = useFriends();
  const [aba, setAba] = useState<StatusDenuncia | "todas">("aberta");
  const { fila, resumo, ready, tratar } = useModeracao(souAdmin, aba);

  if (!souAdmin)
    return (
      <EmptyState
        title="Esta área é da moderação."
        text="Só quem cuida da comunidade vê as denúncias."
      />
    );

  return (
    <section className="moderacao">
      {resumo && (
        <div className="estrelas-painel">
          <div>
            <b>{resumo.abertas}</b>
            <span>abertas</span>
          </div>
          <div>
            <b>{resumo.analisadas}</b>
            <span>analisadas</span>
          </div>
          <div>
            <b>{resumo.pessoasDenunciadas}</b>
            <span>pessoas</span>
          </div>
        </div>
      )}

      <div className="settings-tabs">
        {ABAS.map((a) => (
          <Button
            key={a.v}
            type="button"
            variant={aba === a.v ? "default" : "secondary"}
            onClick={() => setAba(a.v)}
          >
            {a.label}
          </Button>
        ))}
      </div>

      {!ready ? (
        <p className="small-note">Carregando…</p>
      ) : fila.length === 0 ? (
        <EmptyState
          title="Nenhuma denúncia nesta lista."
          text="Quando alguém denunciar um perfil ou uma tribo, aparece aqui, com a mais grave em cima."
        />
      ) : (
        <div className="moderacao-fila">
          {fila.map((d) => {
            const grau = urgencia(d);
            return (
              <article className={"denuncia " + grau} key={d.id}>
                <header>
                  <span className={"denuncia-grau " + grau}>
                    {grau === "alta" ? "Urgente" : grau === "media" ? "Atenção" : "Comum"}
                  </span>
                  <b>{motivoEmPalavras(d.motivo)}</b>
                  <small>{timeAgo(d.quando)}</small>
                </header>

                <p className="denuncia-alvo">
                  {d.alvoId ? (
                    <>
                      Contra{" "}
                      <Link to="/nommi/$id" params={{ id: d.alvoId }}>
                        {d.alvoNome || "um perfil"}
                      </Link>
                    </>
                  ) : d.triboId ? (
                    <>
                      Contra a tribo{" "}
                      <Link to="/grupos/$id" params={{ id: String(d.triboId) }}>
                        {d.triboNome}
                      </Link>
                    </>
                  ) : (
                    "Sem alvo"
                  )}
                  {d.denunciasContra > 1 && (
                    <span className="denuncia-reincidente">
                      {d.denunciasContra} denúncias contra esta pessoa
                    </span>
                  )}
                </p>

                {d.nota && <p className="denuncia-nota">“{d.nota}”</p>}
                <small className="small-note">Quem denunciou: {d.quemDenunciou}</small>

                {d.status === "aberta" && (
                  <div className="denuncia-acoes">
                    <Button
                      size="sm"
                      onClick={async () =>
                        notify(
                          (await tratar(d.id, "analisada"))
                            ? "Marcada como analisada."
                            : "Não deu para salvar.",
                        )
                      }
                    >
                      <Icon name="check" />
                      Analisada
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={async () =>
                        notify(
                          (await tratar(d.id, "arquivada")) ? "Arquivada." : "Não deu para salvar.",
                        )
                      }
                    >
                      Arquivar
                    </Button>
                  </div>
                )}
                {d.status !== "aberta" && (
                  <small className="small-note">Situação: {d.status}</small>
                )}
              </article>
            );
          })}
        </div>
      )}
      <p className="small-note">
        Denúncia de assédio ou de encontro inseguro vem sempre em primeiro lugar, e reincidência
        sobe na fila.
      </p>
    </section>
  );
}
