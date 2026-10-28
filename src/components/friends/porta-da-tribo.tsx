import { useState } from "react";
import { Button } from "@/components/ui/button";
import { enderecoDaImagem } from "@/lib/covers";
import {
  MAX_RECADO,
  portaDaTribo,
  recadoDaPorta,
  useMinhaPorta,
  usePedidosDaTribo,
  type Entrada,
  type MeuPedido,
} from "@/lib/porta-da-tribo";
import { SemFoto, Avatar, Icon } from "./art";
import { Sheet } from "./surfaces";
import { useFriends } from "./store";

/** O botão de entrar, que muda de cara conforme a porta da tribo. */
export function BotaoDaPorta({
  me,
  teiaId,
  entrada,
  meuPedido,
  souMembro,
  souCriadora,
  aoEntrar,
  aoPedir,
}: {
  me: string;
  teiaId: number;
  entrada: Entrada;
  meuPedido: MeuPedido;
  souMembro: boolean;
  souCriadora: boolean;
  aoEntrar: () => void | Promise<void>;
  aoPedir?: () => void;
}) {
  const { notify } = useFriends();
  const { pedir, desistir, pedindo } = useMinhaPorta(teiaId, me);
  const [abrindo, setAbrindo] = useState(false);
  const [recado, setRecado] = useState("");
  const estado = portaDaTribo({ souMembro, souCriadora, entrada, meuPedido });

  if (estado === "dentro") return null;

  if (estado === "entrar")
    return (
      <Button onClick={() => void aoEntrar()}>
        <Icon name="plus" />
        Entrar
      </Button>
    );

  if (estado === "esperando")
    return (
      <div className="porta-espera">
        <p className="small-note">{recadoDaPorta(estado)}</p>
        <Button
          variant="secondary"
          size="sm"
          onClick={async () => {
            if (await desistir()) {
              notify("Pedido cancelado.");
              aoPedir?.();
            } else notify("Não deu para cancelar agora.");
          }}
        >
          Cancelar pedido
        </Button>
      </div>
    );

  if (estado === "recusado") return <p className="small-note">{recadoDaPorta(estado)}</p>;

  return (
    <>
      <Button variant="secondary" onClick={() => setAbrindo(true)}>
        <Icon name="lock" />
        Pedir para entrar
      </Button>
      {abrindo && (
        <Sheet title="Pedir para entrar" onClose={() => setAbrindo(false)}>
          <p className="small-note">{recadoDaPorta("pedir")}</p>
          <label className="field">
            <span>
              Conte por que você quer entrar <small>opcional</small>
            </span>
            <textarea
              className="input"
              rows={3}
              maxLength={MAX_RECADO}
              value={recado}
              placeholder="Oi! Também gosto de caminhar de manhã…"
              onChange={(e) => setRecado(e.target.value)}
            />
          </label>
          <Button
            disabled={pedindo}
            onClick={async () => {
              const r = await pedir(recado);
              notify(
                r.ok ? "Pedido enviado. Quem cuida da tribo vai ver." : (r.erro ?? "Não deu."),
              );
              if (r.ok) {
                setAbrindo(false);
                aoPedir?.();
              }
            }}
          >
            {pedindo ? "Enviando…" : "Enviar pedido"}
          </Button>
        </Sheet>
      )}
    </>
  );
}

/** A fila de pedidos, para quem cuida da tribo. */
export function PedidosDaTribo({
  teiaId,
  souCriadora,
  aoResponder,
}: {
  teiaId: number;
  souCriadora: boolean;
  aoResponder?: () => void;
}) {
  const { notify } = useFriends();
  const { pedidos, ready, responder } = usePedidosDaTribo(teiaId, souCriadora);
  if (!souCriadora || !ready || pedidos.length === 0) return null;

  return (
    <section className="pedidos">
      <div className="section-heading">
        <h2>
          Querem entrar <span className="pedidos-conta">{pedidos.length}</span>
        </h2>
      </div>
      {pedidos.map((p) => (
        <article className="pedido" key={p.userId}>
          {p.avatar ? (
            <img
              className="story-face"
              src={enderecoDaImagem(p.avatar)}
              alt=""
              width={48}
              height={48}
            />
          ) : (
            <SemFoto nome={p.nome} size={48} />
          )}
          <div className="pedido-quem">
            <b>{p.nome}</b>
            {p.cidade && <small>{p.cidade}</small>}
            {p.recado && <p>“{p.recado}”</p>}
          </div>
          <div className="pedido-acoes">
            <Button
              size="sm"
              onClick={async () => {
                const ok = await responder(p.userId, true);
                notify(ok ? `${p.nome} entrou na tribo.` : "Não deu para aceitar agora.");
                if (ok) aoResponder?.();
              }}
            >
              <Icon name="check" />
              Aceitar
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={async () => {
                const ok = await responder(p.userId, false);
                notify(ok ? "Pedido recusado." : "Não deu para recusar agora.");
              }}
            >
              Agora não
            </Button>
          </div>
        </article>
      ))}
    </section>
  );
}
