import "./pippo.css";
import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Icon } from "./art";
import rostoPippo from "@/assets/stickers/pippo/2-pippo-01.png";
import apontaPippo from "@/assets/stickers/pippo/15-pippo-14.png";

/** O rosto do Pippo, recortado do pacote de figurinhas (sem a legenda). */
export function PippoRosto({ tamanho = 52 }: { tamanho?: number }) {
  return (
    <span className="pippo-rosto" style={{ width: tamanho, height: tamanho }} aria-hidden="true">
      <img src={rostoPippo} alt="" />
    </span>
  );
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
        <PippoRosto />
      </button>
    </div>
  );
}
