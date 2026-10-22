import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Icon } from "./art";
import { EmptyState } from "./surfaces";
import { useAvisos, iconeDoAviso, diaDoAviso, destinoDoAviso, type Aviso } from "@/lib/avisos";
import { timeAgo } from "@/lib/posts";

function Linha({ a, onTocar, onApagar }: { a: Aviso; onTocar: () => void; onApagar: () => void }) {
  const destino = destinoDoAviso(a);
  const conteudo = (
    <>
      <span className={"aviso-icone" + (a.lido ? "" : " novo")}>
        <Icon name={iconeDoAviso(a.kind)} />
      </span>
      <div>
        <p>{a.body}</p>
        <small>{timeAgo(a.quando)}</small>
      </div>
    </>
  );
  return (
    <div className={"aviso" + (a.lido ? "" : " nao-lido")}>
      {destino.params ? (
        <Link to={destino.to} params={destino.params} className="aviso-link" onClick={onTocar}>
          {conteudo}
        </Link>
      ) : (
        <Link to={destino.to} className="aviso-link" onClick={onTocar}>
          {conteudo}
        </Link>
      )}
      <Button variant="ghost" size="icon" aria-label="Apagar aviso" onClick={onApagar}>
        <Icon name="close" />
      </Button>
    </div>
  );
}

/** Tudo que aconteceu com você enquanto o app estava fechado. */
export function Avisos({ me }: { me: string }) {
  const { avisos, ready, naoLidos, marcar, marcarTodos, apagar } = useAvisos(me);
  if (!ready) return <p className="small-note">Carregando…</p>;
  if (!avisos.length)
    return (
      <EmptyState
        title="Nada novo por enquanto."
        text="Quando alguém pedir sua amizade, comentar no seu post ou entrar na sua tribo, você fica sabendo aqui."
      >
        <Button asChild>
          <Link to="/descobrir">
            <Icon name="spark" />
            Encontrar pessoas
          </Link>
        </Button>
      </EmptyState>
    );

  let dia = "";
  return (
    <div className="avisos">
      {naoLidos > 0 && (
        <div className="avisos-topo">
          <span>
            {naoLidos} {naoLidos === 1 ? "aviso novo" : "avisos novos"}
          </span>
          <Button variant="ghost" size="sm" onClick={() => void marcarTodos()}>
            Marcar tudo como lido
          </Button>
        </div>
      )}
      {avisos.map((a) => {
        const d = diaDoAviso(a.quando);
        const marcador = d !== dia ? ((dia = d), d) : null;
        return (
          <div key={a.id}>
            {marcador && <p className="chat-day">{marcador}</p>}
            <Linha a={a} onTocar={() => void marcar(a.id)} onApagar={() => void apagar(a.id)} />
          </div>
        );
      })}
    </div>
  );
}
