import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Icon } from "./art";

/**
 * O aviso de que a política mudou, antes de valer.
 *
 * Não é um banner que dá para ignorar: o texto velho dizia que os dados ficavam
 * no aparelho, o que nunca foi verdade. Quem já tem conta merece ler o certo e
 * dizer se concorda; quem está chegando aceita no cadastro e nunca vê isto.
 */
export function AvisoDeAceite({ onAceitar }: { onAceitar: () => Promise<void> }) {
  const [indo, setIndo] = useState(false);
  return (
    <div className="aceite-veu" role="dialog" aria-modal="true" aria-labelledby="aceite-titulo">
      <div className="aceite-cartao">
        <span className="aceite-selo" aria-hidden="true">
          <Icon name="lock" />
        </span>
        <h2 id="aceite-titulo">Atualizamos os termos e a política.</h2>
        <div className="aceite-links">
          <Link to="/privacidade">Ler a política</Link>
          <Link to="/termos">Ler os termos</Link>
        </div>
        <Button
          className="wide"
          disabled={indo}
          onClick={async () => {
            setIndo(true);
            await onAceitar();
          }}
        >
          {indo ? "Um instante…" : "Li e concordo"}
          <Icon name="arrow" />
        </Button>
        <p className="aceite-rodape">Os dois textos ficam em Meu nommi, em Privacidade.</p>
      </div>
    </div>
  );
}
