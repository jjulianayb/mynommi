import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Brand } from "./surfaces";
import { useDemoSession } from "./session";
import { Account } from "./account";
import { presentationDemo } from "@/lib/nommi-access";
import rioPhoto from "@/assets/welcome-rio.jpg";
import trilhaPhoto from "@/assets/moments/trilha.jpg";
import karaokePhoto from "@/assets/moments/karaoke.jpg";
import vinhoPhoto from "@/assets/moments/vinho.jpg";
import corridaPhoto from "@/assets/moments/corrida.jpg";
import pizzaPhoto from "@/assets/moments/pizza.jpg";

/** Cenas do fundo da entrada. A primeira é a que abre; as outras entram em sequência. */
const SCENES = [
  { src: rioPhoto, alt: "Rio de Janeiro ao entardecer" },
  { src: vinhoPhoto, alt: "Amigos brindando" },
  { src: trilhaPhoto, alt: "Grupo numa trilha" },
  { src: karaokePhoto, alt: "Noite de karaokê entre amigos" },
  { src: corridaPhoto, alt: "Corrida em grupo" },
  { src: pizzaPhoto, alt: "Pizza entre amigos" },
];
const PER_SCENE = 5;

export function Welcome() {
  const { startDemo } = useDemoSession();
  const [demo, setDemo] = useState(false);
  useEffect(() => {
    setDemo(presentationDemo(window.location.search));
  }, []);

  return (
    <div className="welcome-rio welcome-fluida">
      <div className="welcome-rio-scenes" aria-hidden="true">
        {SCENES.map((s, i) => (
          <img
            key={s.src}
            className="welcome-rio-photo"
            src={s.src}
            alt=""
            style={{
              animationDelay: `${i * PER_SCENE}s`,
              animationDuration: `${SCENES.length * PER_SCENE}s`,
            }}
            loading={i === 0 ? "eager" : "lazy"}
          />
        ))}
      </div>
      <div className="welcome-rio-overlay" aria-hidden="true" />
      <div className="welcome-rio-content">
        <div className="welcome-rio-brand">
          <Brand />
        </div>
        <p className="welcome-rio-manifesto">
          Novas pessoas.
          <br />
          Novas histórias.
          <br />
          Novas tribos.
        </p>
        <div className="welcome-rio-buttons">
          <Link className="welcome-rio-primary" to="/conta" search={{ modo: "criar" }}>
            Criar minha conta
          </Link>
          <Link className="welcome-rio-secondary" to="/conta" search={{ modo: "entrar" }}>
            Já tenho conta
          </Link>
          <div className="welcome-rio-links">
            <Link to="/conta" search={{ anfitriao: true }}>
              Sou anfitrião
            </Link>
            {demo && (
              <button type="button" onClick={startDemo}>
                Abrir apresentação
              </button>
            )}
          </div>
        </div>
        <p className="welcome-rio-note">Para quem tem 18 anos ou mais.</p>
      </div>
    </div>
  );
}
export function Registration() {
  return <Account initialMode="criar" />;
}
export function Login({ partner = false }: { partner?: boolean }) {
  return <Account initialBusiness={partner} />;
}
export function RecoverPassword() {
  return <Account />;
}
