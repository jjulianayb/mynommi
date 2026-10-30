import { Link } from "@tanstack/react-router";
import {
  convitePelaPorta,
  faltamParaAPorta,
  fraseDaPorta,
  quantoEncheu,
} from "@/lib/porta-que-abre";
import { Icon } from "./art";

/**
 * A porta da tribo, no topo dela.
 *
 * O número é o real, sempre. O que muda o ânimo não é parecer cheia: é saber
 * o que falta e saber que chamar uma amiga resolve.
 */
export function PortaQueAbre({ membros }: { membros: number }) {
  const faltam = faltamParaAPorta(membros);
  const convite = convitePelaPorta(membros);

  return (
    <section className={"porta-abre" + (faltam === 0 ? " completa" : "")}>
      <p className="porta-frase">{fraseDaPorta(membros)}</p>
      {faltam > 0 && (
        <>
          <div className="porta-barra" aria-hidden="true">
            <span style={{ width: quantoEncheu(membros) + "%" }} />
          </div>
          <div className="porta-acao">
            <p>{convite}</p>
            <Link to="/convidar" className="porta-botao">
              <Icon name="send" />
              Chamar amigas
            </Link>
          </div>
        </>
      )}
    </section>
  );
}
