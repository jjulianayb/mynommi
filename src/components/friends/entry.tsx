import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Brand } from "./surfaces";
import { useDemoSession } from "./session";
import { Account } from "./account";
import { presentationDemo } from "@/lib/nommi-access";

/** Teia desenhada: nós ligados por linhas, a imagem da marca. Sem foto de banco. */
function TeiaArt() {
  const nodes = [
    [16, 30],
    [44, 14],
    [74, 26],
    [88, 56],
    [66, 78],
    [34, 84],
    [10, 62],
    [50, 48],
  ] as const;
  const links = [
    [0, 1],
    [1, 2],
    [2, 3],
    [3, 4],
    [4, 5],
    [5, 6],
    [6, 0],
    [7, 0],
    [7, 2],
    [7, 4],
    [7, 5],
    [1, 7],
  ] as const;
  return (
    <svg className="teia-art" viewBox="0 0 100 100" aria-hidden="true">
      {links.map(([a, b], i) => {
        const p = nodes[a]!;
        const q = nodes[b]!;
        return <line key={i} x1={p[0]} y1={p[1]} x2={q[0]} y2={q[1]} />;
      })}
      {nodes.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r={i === 7 ? 5 : 3.2} className={i === 7 ? "hub" : ""} />
      ))}
    </svg>
  );
}

export function Welcome() {
  const { startDemo } = useDemoSession();
  const [splash, setSplash] = useState(true);
  const [demo, setDemo] = useState(false);
  useEffect(() => {
    setDemo(presentationDemo(window.location.search));
    const t = setTimeout(() => setSplash(false), 900);
    return () => clearTimeout(t);
  }, []);

  if (splash)
    return (
      <div className="nomi-splash brand-splash" role="status" aria-label="Abrindo a nommi">
        <Brand />
      </div>
    );

  return (
    <div className="welcome-nommi">
      <div className="welcome-nommi-inner">
        <header className="welcome-nommi-brand">
          <Brand />
        </header>
        <section className="welcome-nommi-hero">
          <TeiaArt />
          <h1>Amizade começa por algo em comum.</h1>
          <p>Pessoas, interesses e teias. Do seu bairro, da sua cidade, de todo o Brasil.</p>
        </section>
        <div className="welcome-nommi-buttons">
          <Link className="welcome-nommi-primary" to="/conta" search={{ modo: "criar" }}>
            Criar minha conta
          </Link>
          <Link className="welcome-nommi-secondary" to="/conta" search={{ modo: "entrar" }}>
            Já tenho conta
          </Link>
          <div className="welcome-nommi-links">
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
        <p className="welcome-nommi-note">Para quem tem 18 anos ou mais.</p>
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
