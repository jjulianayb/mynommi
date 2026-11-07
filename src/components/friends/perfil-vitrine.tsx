import { Link } from "@tanstack/react-router";
import { Icon } from "./art";
import { ChipIcone } from "./combinar";
import { capaDaTribo } from "./descobrir-tribos";
import { useSelos } from "@/lib/selos";
import { useMinhasTribos } from "@/lib/minhas-tribos";
import { usePosts } from "@/lib/posts";

/**
 * Módulos da vitrine do Meu nommi (mockup de 07/11). Cada módulo só aparece
 * com dado real; sem dado, um convite discreto para a própria dona.
 * Nada aqui inventa selo, tribo, momento ou interesse.
 */

const TONS_DOS_SELOS = ["coral", "menta", "lavanda", "sol"] as const;

export function InteressesChips({ interesses, onEditar }: { interesses: string[]; onEditar: () => void }) {
  if (interesses.length === 0)
    return (
      <button type="button" className="pv-convite" onClick={onEditar}>
        <Icon name="plus" /> Conte do que você gosta
      </button>
    );
  const visiveis = interesses.slice(0, 4);
  const resto = interesses.length - visiveis.length;
  return (
    <div className="pv-chips">
      {visiveis.map((i) => (
        <span key={i} className="pv-chip">
          <ChipIcone i={i} />
          {i}
        </span>
      ))}
      {resto > 0 && (
        <button type="button" className="pv-chip pv-chip-mais" onClick={onEditar}>
          +{resto}
        </button>
      )}
    </div>
  );
}

export function AmigosDescrevem({ dono }: { dono: string }) {
  const { selos, ready } = useSelos(dono);
  if (!ready) return null;
  return (
    <section className="pv-bloco pv-selos">
      <div className="pv-cabeca">
        <h2>
          <Icon name="spark" /> Como meus amigos me descrevem
        </h2>
      </div>
      {selos.length === 0 ? (
        <p className="pv-vazio">Quando suas amizades carimbarem como você é, aparece aqui.</p>
      ) : (
        <div className="pv-selos-trilho">
          {selos.map((s, n) => (
            <span key={s.selo} className={"pv-selo " + TONS_DOS_SELOS[n % TONS_DOS_SELOS.length]}>
              {s.selo}
              {s.quantos > 1 && <small>×{s.quantos}</small>}
            </span>
          ))}
        </div>
      )}
    </section>
  );
}

export function ConexaoBuscada({ frase, tags, onEditar }: { frase: string; tags: string[]; onEditar: () => void }) {
  const texto = frase || tags.join(", ");
  return (
    <section className="pv-bloco pv-conexao">
      <span className="pv-conexao-icone">
        <Icon name="heart" />
      </span>
      <div>
        <h2>Que tipo de conexão estou buscando?</h2>
        {texto ? (
          <p>{texto}</p>
        ) : (
          <button type="button" className="pv-link" onClick={onEditar}>
            Contar o que você procura
          </button>
        )}
      </div>
    </section>
  );
}

export function TribosEMomentos({ me }: { me: string }) {
  const { tribos, ready } = useMinhasTribos(true);
  const { posts } = usePosts(me, { authorId: me });
  const fotos = posts
    .flatMap((p) => p.media.filter((m) => m.kind === "foto" && m.url).map((m) => ({ id: m.id, url: m.url! })))
    .slice(0, 2);
  const visiveis = tribos.slice(0, 3);
  const resto = tribos.length - visiveis.length;
  return (
    <div className="pv-duplo">
      <section className="pv-bloco pv-mini">
        <div className="pv-cabeca">
          <h2>
            <Icon name="teia" /> Minhas tribos
          </h2>
          {tribos.length > 0 && (
            <Link to="/grupos" className="pv-link">
              Ver todas
            </Link>
          )}
        </div>
        {ready && tribos.length === 0 ? (
          <Link to="/grupos" className="pv-vazio pv-link">
            Encontre sua primeira tribo
          </Link>
        ) : (
          <div className="pv-grade">
            {visiveis.map((t) => (
              <Link key={t.id} to="/grupos/$id" params={{ id: String(t.id) }} className="pv-tribo">
                <img src={capaDaTribo(t.nome, t.capa || null)} alt="" loading="lazy" />
                <span>{t.nome}</span>
              </Link>
            ))}
            {resto > 0 && (
              <Link to="/grupos" className="pv-mais">
                +{resto}
              </Link>
            )}
          </div>
        )}
      </section>
      <section className="pv-bloco pv-mini">
        <div className="pv-cabeca">
          <h2>
            <Icon name="image" /> Meus momentos
          </h2>
        </div>
        <div className="pv-grade">
          {fotos.map((f) => (
            <img key={f.id} className="pv-momento" src={f.url} alt="" loading="lazy" />
          ))}
          <Link to="/" className="pv-mais" aria-label="Publicar um momento">
            <Icon name="plus" />
          </Link>
        </div>
      </section>
    </div>
  );
}
