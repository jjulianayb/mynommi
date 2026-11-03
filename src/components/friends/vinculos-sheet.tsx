import { Link } from "@tanstack/react-router";
import { SemFoto } from "./art";
import { EmptyState, Sheet } from "./surfaces";
import { enderecoDaImagem } from "@/lib/covers";
import {
  TITULO_VINCULO,
  VAZIO_VINCULO,
  useVinculos,
  type PessoaDaLista,
  type TipoVinculo,
} from "@/lib/vinculos";

function Face({ p }: { p: PessoaDaLista }) {
  const nome = p.nickname || "nommi";
  return p.avatar_url ? (
    <img
      className="real-face"
      src={enderecoDaImagem(p.avatar_url)}
      width={48}
      height={48}
      style={{ width: 48, height: 48 }}
      alt={"Foto de " + nome}
    />
  ) : (
    <SemFoto nome={nome} size={48} />
  );
}

/** Lista de seguidores/seguindo/amigos da própria pessoa, aberta a partir dos números do Meu Nommi. */
export function VinculosSheet({
  me,
  tipo,
  onClose,
}: {
  me: string;
  tipo: TipoVinculo;
  onClose: () => void;
}) {
  const { pessoas, pronto } = useVinculos(me, tipo);
  return (
    <Sheet title={TITULO_VINCULO[tipo]} onClose={onClose}>
      {!pronto && <EmptyState title="Carregando..." text="" />}
      {pronto && pessoas.length === 0 && (
        <EmptyState title="Ninguém por aqui ainda." text={VAZIO_VINCULO[tipo]} />
      )}
      <div className="community-members">
        {pessoas.map((p) => (
          <Link
            className="community-member"
            key={p.id}
            to="/nommi/$id"
            params={{ id: p.id }}
            aria-label={"Ver o perfil de " + (p.nickname || "um nommi")}
          >
            <Face p={p} />
            <h3>{p.nickname || "nommi"}</h3>
          </Link>
        ))}
      </div>
    </Sheet>
  );
}
