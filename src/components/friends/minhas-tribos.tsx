import { Link } from "@tanstack/react-router";
import { enderecoDaImagem } from "@/lib/covers";
import {
  contador,
  quandoFoi,
  recadoDaTribo,
  temNovidade,
  useMinhasTribos,
} from "@/lib/minhas-tribos";
import { Icon } from "./art";
import { Esqueleto } from "./surfaces";

/**
 * As tribos da pessoa, no Início, com a última fala.
 * Quem já está dentro não quer vitrine: quer saber onde tem conversa nova.
 */
export function MinhasTribos({ ativo }: { ativo: boolean }) {
  const { tribos, ready } = useMinhasTribos(ativo);
  if (!ativo) return null;
  if (!ready) return <Esqueleto tipo="conversa" />;
  if (tribos.length === 0) return null;

  return (
    <section className="home-section" data-tour="minhas-tribos">
      <div className="section-heading">
        <h2>Suas tribos</h2>
        <Link to="/grupos" className="section-link">
          Ver todas
          <Icon name="arrow" />
        </Link>
      </div>
      <div className="tribo-linhas">
        {tribos.map((t) => (
          <Link
            key={t.id}
            className={"tribo-linha" + (temNovidade(t) ? " nova" : "")}
            to="/grupos/$id"
            params={{ id: String(t.id) }}
          >
            <span className="tribo-capa">
              {t.capa ? (
                <img src={enderecoDaImagem(t.capa)} alt="" width={52} height={52} />
              ) : (
                <Icon name="teia" />
              )}
            </span>
            <span className="tribo-meio">
              <b>{t.nome}</b>
              <small>{recadoDaTribo(t)}</small>
            </span>
            <span className="tribo-fim">
              {t.ultimaEm && <em>{quandoFoi(t.ultimaEm)}</em>}
              {temNovidade(t) && <span className="tribo-conta">{contador(t.naoLidas)}</span>}
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
