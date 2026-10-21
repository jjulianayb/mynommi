import type { ReactNode } from "react";
import type { Audience, ProfileMode } from "@/lib/friends-data";
import { people } from "@/lib/friends-data";
import { Icon } from "./art";
import { useFriends } from "./store";

type Area = "fotos" | "roles" | "teia";
const labels: Record<Area, [string, string]> = {
  fotos: ["Fotos e momentos", "A grade de momentos do seu perfil."],
  roles: ["Rolês", "Suas saídas com as suas amizades."],
  teia: ["Tribo de amizades", "As tribos e pessoas com quem você se conecta."],
};
const audiences: [Audience, string][] = [
  ["todos", "Todo mundo no Nommi"],
  ["amizades", "Só minhas amizades"],
  ["so-eu", "Só eu"],
];
export const defaultVisibility = { fotos: "amizades", roles: "amizades", teia: "todos" } as Record<
  Area,
  Audience
>;

/** Demo-only: other people's settings are simulated (non-matches keep photos and Rolês for friends only). */
function otherAudience(area: Area, personId: number): Audience {
  if (people.find((p) => p.id === personId)?.private) return "amizades";
  return area === "teia" ? "todos" : personId % 2 ? "amizades" : "todos";
}

export function Gate({
  area,
  own,
  personId,
  children,
}: {
  area: Area;
  own: boolean;
  personId: number;
  children: ReactNode;
}) {
  const { state } = useFriends();
  const vis = state.visibility ?? defaultVisibility;
  if (own)
    return (
      <>
        <p className="privacy-badge">
          <Icon name="lock" />
          {labels[area][0]}: {audiences.find((a) => a[0] === vis[area])?.[1]}
        </p>
        {children}
      </>
    );
  const a = otherAudience(area, personId);
  const friend = state.matches.includes(personId);
  if (a === "todos" || (a === "amizades" && friend)) return <>{children}</>;
  return (
    <div className="privacy-locked">
      <Icon name="lock" />
      <p>
        <b>{labels[area][0]} visíveis só para amizades.</b>
        <br />
        <span className="small-note">Depois de um encontro na mesma tribo, isso aparece aqui.</span>
      </p>
    </div>
  );
}

export function PrivacyControls() {
  const { state, setState, notify } = useFriends();
  const vis = state.visibility ?? defaultVisibility;
  return (
    <div className="privacy-controls">
      <h2 className="settings-subtitle">Quem pode ver no seu perfil</h2>
      {(Object.keys(labels) as Area[]).map((k) => (
        <div className="privacy-row" key={k}>
          <div>
            <h2>{labels[k][0]}</h2>
            <p className="small-note">{labels[k][1]}</p>
          </div>
          <select
            className="input"
            aria-label={"Quem vê " + labels[k][0]}
            value={vis[k]}
            onChange={(e) => {
              const v = e.target.value as Audience;
              setState((s) => ({
                ...s,
                visibility: { ...(s.visibility ?? defaultVisibility), [k]: v },
              }));
              notify(labels[k][0] + ": " + audiences.find((a) => a[0] === v)?.[1] + ".");
            }}
          >
            {audiences.map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
        </div>
      ))}
    </div>
  );
}

export const PROFILE_MODES: [ProfileMode, string, string][] = [
  [
    "publico",
    "Perfil público",
    "Qualquer pessoa pode te encontrar pelo nome de usuário e ver o que você deixou visível.",
  ],
  [
    "privado",
    "Perfil privado",
    "Só quem tem tribo em comum ou amizade confirmada vê seu perfil; você não aparece em buscas e sugestões.",
  ],
];
/** Ao mudar o modo, ajusta o padrão de visibilidade (cada área ainda pode ser ajustada depois). */
export function visibilityFor(mode: ProfileMode): Record<Area, Audience> {
  return mode === "privado"
    ? { fotos: "amizades", roles: "amizades", teia: "amizades" }
    : { ...defaultVisibility };
}
export function ProfileModeChoice({
  value,
  onChange,
}: {
  value: ProfileMode;
  onChange: (m: ProfileMode) => void;
}) {
  return (
    <fieldset className="profile-mode">
      <legend>Quem pode ver seu perfil</legend>
      {PROFILE_MODES.map(([v, t, d]) => (
        <label key={v} className="checkbox-line">
          <input
            type="radio"
            name="profile-mode"
            value={v}
            checked={value === v}
            onChange={() => onChange(v)}
          />
          <span>
            <b>{t}</b> — {d}
          </span>
        </label>
      ))}
    </fieldset>
  );
}
export function ProfileModeBadge({ mode }: { mode: ProfileMode }) {
  return (
    <p className="privacy-badge">
      <Icon name={mode === "privado" ? "lock" : "eye"} />
      {mode === "privado" ? "Perfil privado" : "Perfil público"}
    </p>
  );
}
export function ProfileModeSetting() {
  const { state, setState, notify } = useFriends();
  const mode = state.profileMode ?? "publico";
  return (
    <div className="privacy-controls">
      <ProfileModeChoice
        value={mode}
        onChange={(m) => {
          setState((s) => ({ ...s, profileMode: m, visibility: visibilityFor(m) }));
          notify(m === "privado" ? "Seu perfil agora é privado." : "Seu perfil agora é público.");
        }}
      />
    </div>
  );
}
export function FirstMeetNotice() {
  return (
    <div className="entry-tip" role="note">
      <Icon name="lock" />
      <p>Primeiro encontro? Prefira um lugar público e avise alguém de confiança.</p>
    </div>
  );
}
