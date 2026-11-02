/*
 * Origem das imagens do Pippo: personagem gerado e construído pela própria Ju.
 * Confirmado por ela em 02/11 às 14:13, com uso liberado como rosto da nommi.
 */
import "./pippo.css";
import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Icon } from "./art";
import rostoPippo from "@/assets/pippo/2-pippo-busto.png";
import apontaPippo from "@/assets/pippo/1-pippo-aponta.png";

export { apontaPippo };

/** O Pippo de busto, com fundo transparente. */
export function PippoRosto({ altura = 84 }: { altura?: number }) {
  return <img className="pippo-busto" src={rostoPippo} alt="" style={{ height: altura }} />;
}

const DICAS = [
  {
    to: "/descobrir",
    icon: "spark",
    titulo: "Descobrir",
    texto: "Veja uma pessoa por vez e diga se quer conhecer.",
  },
  {
    to: "/grupos",
    icon: "teia",
    titulo: "Tribos",
    texto: "Entre numa tribo pelo que você gosta e converse por lá.",
  },
  {
    to: "/perfil",
    icon: "users",
    titulo: "Meu nommi",
    texto: "Foto, capa e interesses: é o que decide se alguém quer te conhecer.",
  },
] as const;

/** Ajudante fixo no cantinho: abre dicas curtas e refaz o tour. */
export function PippoAjudante({ aoRefazerTour }: { aoRefazerTour: () => void }) {
  const [aberto, setAberto] = useState(false);
  return (
    <div className="pippo-canto">
      {aberto && (
        <div className="pippo-painel" role="dialog" aria-label="Pippo, seu ajudante">
          <img className="pippo-aponta" src={apontaPippo} alt="" />
          <h2>Oi, eu sou o Pippo</h2>
          <p>Te mostro por onde começar na nommi.</p>
          <ul>
            {DICAS.map((d) => (
              <li key={d.to}>
                <Link to={d.to} onClick={() => setAberto(false)}>
                  <Icon name={d.icon} />
                  <span>
                    <b>{d.titulo}</b>
                    <small>{d.texto}</small>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
          <button
            type="button"
            className="pippo-tour"
            onClick={() => {
              setAberto(false);
              aoRefazerTour();
            }}
          >
            Fazer o tour do app
          </button>
        </div>
      )}
      <button
        type="button"
        className="pippo-botao"
        aria-label={aberto ? "Fechar o Pippo" : "Falar com o Pippo"}
        aria-expanded={aberto}
        onClick={() => setAberto((a) => !a)}
      >
        <PippoRosto altura={92} />
      </button>
    </div>
  );
}
