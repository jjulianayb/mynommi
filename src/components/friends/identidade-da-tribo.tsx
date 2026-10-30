import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import {
  desenhoDaFigurinha,
  recadoSemRole,
  separarRoles,
  useRolesDaTribo,
  type QuemCriaRole,
} from "@/lib/tribo-da-dona";
import { Icon } from "./art";

/**
 * Missão, valores e visão da tribo, no topo dela.
 *
 * Só aparece o que a dona escreveu. Tribo sem nada escrito não mostra título
 * vazio nem "em branco": três cabeçalhos sem texto embaixo fazem a tribo
 * parecer abandonada, e o efeito é o contrário do pretendido.
 */
export function IdentidadeDaTribo({
  missao,
  valores,
  visao,
  figurinha,
}: {
  missao: string;
  valores: string;
  visao: string;
  figurinha: string;
}) {
  const partes = [
    { titulo: "Missão", texto: missao },
    { titulo: "Valores", texto: valores },
    { titulo: "Visão", texto: visao },
  ].filter((x) => (x.texto ?? "").trim() !== "");
  const fig = desenhoDaFigurinha(figurinha);
  if (!partes.length && !fig) return null;

  return (
    <section className="tribo-identidade">
      {fig && (
        <span className="tribo-identidade-fig" aria-hidden="true">
          {fig}
        </span>
      )}
      {partes.map((x) => (
        <div key={x.titulo}>
          <h2>{x.titulo}</h2>
          <p>{x.texto}</p>
        </div>
      ))}
    </section>
  );
}

/**
 * Os rolês desta tribo.
 *
 * Antes, a aba Eventos da tribo mostrava uma meta de exemplo ("Próxima parada:
 * day spa", com pontos) para conta real, sobra da apresentação. E rolê e tribo
 * não tinham ligação nenhuma no banco: todo rolê era solto. Agora o rolê que
 * nasce aqui aponta para esta tribo.
 */
export function RolesDaTribo({
  triboId,
  quemCria,
  euPodeCriar,
}: {
  triboId: number;
  quemCria: QuemCriaRole;
  euPodeCriar: boolean;
}) {
  const { roles, ready } = useRolesDaTribo(triboId);
  const { proximos, passados } = separarRoles(roles);

  return (
    <section className="tribo-roles">
      {euPodeCriar && (
        <Button asChild className="wide">
          <Link to="/criar-grupo" search={{ tipo: "role", tribo: String(triboId) }}>
            <Icon name="plus" />
            Marcar um rolê desta tribo
          </Link>
        </Button>
      )}

      {ready && !roles.length && <p className="muted small">{recadoSemRole(euPodeCriar, quemCria)}</p>}

      {proximos.length > 0 && (
        <>
          <h2 className="settings-subtitle">O que vem</h2>
          <div className="role-lista">
            {proximos.map((r) => (
              <Link key={r.id} to="/grupos/$id" params={{ id: String(r.id) }} className="role-linha">
                <b>{r.name}</b>
                <small>
                  {[r.place, r.when_text].filter(Boolean).join(" · ") || "sem lugar marcado"}
                </small>
                <span className="role-quantos">
                  {r.going_count === 0
                    ? "ninguém confirmou"
                    : r.going_count === 1
                      ? "1 vai"
                      : `${r.going_count} vão`}
                  {r.i_am_going ? " · você vai" : ""}
                </span>
              </Link>
            ))}
          </div>
        </>
      )}

      {passados.length > 0 && (
        <>
          <h2 className="settings-subtitle">Já rolou</h2>
          <div className="role-lista">
            {passados.map((r) => (
              <Link key={r.id} to="/grupos/$id" params={{ id: String(r.id) }} className="role-linha passado">
                <b>{r.name}</b>
                <small>{[r.place, r.when_text].filter(Boolean).join(" · ")}</small>
              </Link>
            ))}
          </div>
        </>
      )}
    </section>
  );
}
