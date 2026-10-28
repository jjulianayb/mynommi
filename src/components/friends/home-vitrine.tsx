import { useEffect, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { SemFoto, Avatar, Icon } from "./art";
import { personPhoto } from "@/lib/friends-photos";
import welcomeRio from "@/assets/welcome-rio.jpg";
import type { Person } from "@/lib/friends-data";

const THEMES = [
  { id: "calcadao", label: "Calçadão" },
  { id: "mata", label: "Mata" },
  { id: "entardecer", label: "Entardecer" },
  { id: "rio", label: "Rio" },
] as const;
type ThemeId = (typeof THEMES)[number]["id"];

const MOODS = [
  "Topando um café",
  "A fim de um rolê hoje",
  "Procurando companhia pra trilha",
  "Só conhecendo gente nova",
];

const THEME_KEY = "nommi-home-theme";
const MOOD_KEY = "nommi-home-mood";

/** Topo pessoal do Início: você em destaque, com fundo e humor do dia escolhidos por você. */
export function VitrineTop({
  nickname,
  city,
  avatar,
}: {
  nickname: string;
  city: string;
  avatar?: string;
}) {
  const navigate = useNavigate();
  const [theme, setTheme] = useState<ThemeId>("calcadao");
  const [mood, setMood] = useState(MOODS[0]);
  const [editing, setEditing] = useState(false);
  useEffect(() => {
    const t = localStorage.getItem(THEME_KEY) as ThemeId | null;
    if (t && THEMES.some((x) => x.id === t)) setTheme(t);
    const m = localStorage.getItem(MOOD_KEY);
    if (m) setMood(m);
  }, []);
  const pickTheme = (t: ThemeId) => {
    setTheme(t);
    localStorage.setItem(THEME_KEY, t);
  };
  const pickMood = (m: string) => {
    setMood(m);
    localStorage.setItem(MOOD_KEY, m);
    setEditing(false);
  };

  return (
    <section className={"vitrine vitrine-" + theme}>
      {theme === "rio" && <img className="vitrine-foto" src={welcomeRio} alt="" />}
      <div className="vitrine-veu">
        <div className="vitrine-linha">
          <Link to="/perfil" className="vitrine-avatar" aria-label="Abrir meu nommi">
            {avatar ? <img src={avatar} alt="" width={64} height={64} /> : <SemFoto size={64} />}
          </Link>
          <div className="vitrine-quem">
            <h1>{nickname ? "Oi, " + nickname + "!" : "Chega mais!"}</h1>
            <button
              type="button"
              className="vitrine-cidade"
              onClick={() => void navigate({ to: "/configuracoes", search: { section: "perfil" } })}
              aria-label="Mudar sua cidade"
            >
              <Icon name="pin" />
              {city}
            </button>
          </div>
        </div>
        <button type="button" className="vitrine-humor" onClick={() => setEditing((v) => !v)}>
          <span>Hoje estou:</span> <b>{mood}</b>
          <Icon name="arrow" />
        </button>
        {editing && (
          <div className="vitrine-opcoes" role="listbox" aria-label="Como você está hoje">
            {MOODS.map((m) => (
              <button
                key={m}
                type="button"
                role="option"
                aria-selected={m === mood}
                className={m === mood ? "on" : ""}
                onClick={() => pickMood(m)}
              >
                {m}
              </button>
            ))}
          </div>
        )}
        <div className="vitrine-temas" aria-label="Escolher fundo do início">
          {THEMES.map((t) => (
            <button
              key={t.id}
              type="button"
              aria-pressed={theme === t.id}
              className={"vitrine-tema tema-" + t.id + (theme === t.id ? " on" : "")}
              onClick={() => pickTheme(t.id)}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}

/** Cartões grandes de pessoas com afinidade. */
export function MatchCards({ list, myInterests }: { list: Person[]; myInterests: string[] }) {
  if (!list.length) return null;
  return (
    <section className="home-section">
      <div className="section-heading">
        <h2>Gente que combina com você</h2>
        <Link to="/descobrir" className="section-link">
          Ver todas
          <Icon name="arrow" />
        </Link>
      </div>
      <div className="match-cards">
        {list.map((p) => {
          const common = p.interests.filter((i) => myInterests.includes(i));
          const score = Math.min(98, 70 + common.length * 9 + (p.id % 7));
          return (
            <Link to="/descobrir" className="match-card" key={p.id}>
              {personPhoto[p.id] ? (
                <img src={personPhoto[p.id]} alt={"Foto de " + p.name.split(" ")[0]} />
              ) : (
                <div className="match-card-sem-foto">
                  <Avatar id={p.id} size={96} />
                </div>
              )}
              <div className="match-card-info">
                <span className="match-score">{score}% de afinidade</span>
                <h3>
                  {p.name.split(" ")[0]}, {p.age}
                </h3>
                <p>
                  <Icon name="pin" /> {p.city} · perto de você
                </p>
                <div className="match-pills">
                  {p.interests.slice(0, 3).map((i) => (
                    <span key={i}>{i}</span>
                  ))}
                </div>
                <span className="match-cta">
                  <Icon name="chat" /> Dar um oi
                </span>
              </div>
            </Link>
          );
        })}
      </div>
      <p className="small-note">Afinidade aproximada pelos interesses. Perfis da apresentação.</p>
    </section>
  );
}
