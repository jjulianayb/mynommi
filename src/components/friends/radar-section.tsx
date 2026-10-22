import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Avatar, Icon } from "@/components/friends/art";
import { EmptyState } from "@/components/friends/surfaces";
import { useFriends } from "@/components/friends/store";
import { useDemoSession } from "@/components/friends/session";
import { supabase } from "@/integrations/supabase/client";
import {
  km,
  distanceLabel,
  coarse,
  kmLabel,
  suggestPlaces,
  presenceRow,
  type RadarNearby,
} from "@/lib/radar";
import { SAMPLE_BOOSTED_PEOPLE } from "@/lib/credits";
import {
  ACTIVITIES,
  PLACES,
  PLACE_TYPES,
  nearestPlace,
  nearbyNommis,
  searchPlaces,
  type Activity,
  type Place,
  type PlaceType,
} from "@/lib/radar";

type Saved = { on: boolean; place: string; activity: Activity; mins: number; until: number };
export function RadarSection() {
  const { state, notify } = useFriends();
  const { cloudUser, demoMode } = useDemoSession();
  const [on, setOn] = useState(false);
  // Sem lugar padrão: a pessoa escolhe onde está antes de entrar no radar,
  // para o app nunca marcar um lugar errado por ela.
  const [place, setPlace] = useState<Place | null>(null);
  const [custom, setCustom] = useState("");
  const [query, setQuery] = useState("");
  const [type, setType] = useState<PlaceType | "">("");
  const [activity, setActivity] = useState<Activity>("Tomar um café");
  const [mins, setMins] = useState(60);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [city, setCity] = useState("");
  const [suggest, setSuggest] = useState<Place[]>([]);
  const [filter, setFilter] = useState<Activity | "">("");
  const [pick, setPick] = useState<number | null>(null);
  const [sent, setSent] = useState<number[]>([]);
  const [locating, setLocating] = useState(false);
  useEffect(() => {
    try {
      const v = JSON.parse(localStorage.getItem("nommi-radar") || "{}") as Partial<Saved>;
      const p = PLACES.find((x) => x.name === v.place);
      if (v.on && p && (v.until ?? 0) > Date.now()) {
        setOn(true);
        setPlace(p);
        if (v.activity) setActivity(v.activity);
        if (v.mins) setMins(v.mins);
      }
    } catch {
      /* sem preferência salva: tudo bem */
    }
  }, []);
  function save(next: Partial<Saved>) {
    try {
      localStorage.setItem(
        "nommi-radar",
        JSON.stringify({
          on,
          place: place?.name ?? "",
          activity,
          mins,
          until: Date.now() + mins * 60000,
          ...next,
        }),
      );
    } catch {
      /* navegador sem espaço: seguimos sem guardar */
    }
  }
  function locate() {
    if (!("geolocation" in navigator)) {
      notify("Seu aparelho não permite localização. Escreva onde você está.");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude,
          lng = pos.coords.longitude;
        setCoords({ lat, lng });
        const perto = suggestPlaces(lat, lng);
        setSuggest(perto);
        setLocating(false);
        if (perto.length) {
          const p = perto[0] as Place;
          setPlace(p);
          setCustom("");
          setQuery("");
          notify("Lugar mais próximo: " + p.name + ". Guardamos só a posição aproximada.");
        } else notify("Pegamos sua posição aproximada. Escreva o nome do lugar onde você está.");
      },
      () => {
        setLocating(false);
        notify("Não conseguimos sua localização. Escreva onde você está.");
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 },
    );
  }
  const results = searchPlaces(query, type);
  const nearby =
    demoMode && place
      ? nearbyNommis(place, { matches: state.matches, blocked: state.blocked, activity: filter })
      : [];
  const sel = nearby.find((n) => n.id === pick);
  const label = custom || place?.name || "";
  return (
    <div className="radar-page">
      <header className="radar-head">
        <h1>Radar Nommi</h1>
        <p>
          Diga onde você está e o que topa agora. Veja outros nommi por perto para um café, uma
          volta ou um cinema.
        </p>
      </header>
      {!on ? (
        <section className="card radar-setup">
          <Button
            type="button"
            variant="secondary"
            className="wide"
            onClick={locate}
            disabled={locating}
          >
            <Icon name="pin" />
            {locating ? "Procurando…" : "Usar minha localização"}
          </Button>
          <label>
            Onde você está
            <input
              className="input"
              value={custom || query}
              placeholder="Ex.: Café da esquina, Praça do bairro"
              onChange={(e) => {
                setQuery(e.target.value);
                setCustom("");
              }}
            />
          </label>
          <label>
            Cidade
            <input
              className="input"
              value={city}
              maxLength={80}
              placeholder="Ex.: Belo Horizonte, Lisboa, São Paulo"
              onChange={(e) => setCity(e.target.value)}
            />
          </label>
          <div className="chips">
            {(["", ...PLACE_TYPES] as const).map((t) => (
              <Button
                variant="ghost"
                key={t || "todos"}
                type="button"
                className={"chip" + (t === type ? " active" : "")}
                aria-pressed={t === type}
                onClick={() => setType(t)}
              >
                {t || "Todos"}
              </Button>
            ))}
          </div>
          <div className="radar-places" role="listbox" aria-label="Lugares públicos">
            {results.slice(0, 8).map((p) => (
              <Button
                variant="ghost"
                key={p.name}
                type="button"
                role="option"
                aria-selected={p.name === place?.name && !custom}
                className={"radar-place" + (p.name === place?.name && !custom ? " active" : "")}
                onClick={() => {
                  setPlace(p);
                  setCustom("");
                }}
              >
                <b>{p.name}</b>
                <small>
                  {p.type} · {p.area}
                </small>
              </Button>
            ))}
            {!results.length && (
              <p className="muted small">
                {coords
                  ? "Escreva o nome do lugar onde você está. Fora de Belo Horizonte ainda não temos lista de lugares."
                  : 'Toque em "Usar minha localização" ou escreva onde você está.'}
              </p>
            )}
          </div>
          {query.trim().length > 2 && !results.length && (
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setCustom(query.trim().slice(0, 60));
                notify("Lugar anotado.");
              }}
            >
              Estou em "{query.trim().slice(0, 60)}"
            </Button>
          )}
          <p className="radar-here">
            <Icon name="pin" />
            {label ? (
              <>
                Você está em: <b>{label}</b>
              </>
            ) : (
              "Escolha um lugar da lista, use sua localização ou escreva onde você está."
            )}
          </p>
          <div>
            <b>Topo agora</b>
            <div className="chips">
              {ACTIVITIES.map((m) => (
                <Button
                  variant="ghost"
                  key={m}
                  type="button"
                  className={"chip" + (m === activity ? " active" : "")}
                  aria-pressed={m === activity}
                  onClick={() => setActivity(m)}
                >
                  {m}
                </Button>
              ))}
            </div>
          </div>
          <div>
            <b>Por quanto tempo</b>
            <div className="chips">
              {[30, 60, 120].map((m) => (
                <Button
                  variant="ghost"
                  key={m}
                  type="button"
                  className={"chip" + (m === mins ? " active" : "")}
                  aria-pressed={m === mins}
                  onClick={() => setMins(m)}
                >
                  {m < 60 ? m + " min" : m / 60 + "h"}
                </Button>
              ))}
            </div>
          </div>
          <Button
            type="button"
            className="wide"
            disabled={!label}
            onClick={async () => {
              if (!label) return;
              if (cloudUser) {
                const row = presenceRow({
                  userId: cloudUser.id,
                  placeName: label,
                  area: place?.area ?? "",
                  city,
                  activity,
                  minutes: mins,
                  lat: coords?.lat,
                  lng: coords?.lng,
                });
                const { error } = await supabase.from("radar_presence").upsert(row);
                if (error) {
                  notify("Não foi possível entrar no radar agora. Tente de supabase.");
                  return;
                }
              }
              setOn(true);
              save({ on: true });
            }}
          >
            <Icon name="pin" />
            Ativar radar nommi
          </Button>
          {state.profileMode === "privado" && (
            <p className="muted small">
              Seu perfil é privado: no radar, seu perfil fica fora da listagem pública.
            </p>
          )}
          <p className="muted small">
            Guardamos só a posição aproximada (cerca de 1 km) para calcular a distância; sua
            localização exata nunca é salva nem mostrada. Você some do radar quando o tempo acaba.
          </p>
        </section>
      ) : (
        <>
          <section className="radar-map" aria-label={"nommi perto de " + label}>
            <span className="radar-ring r1" />
            <span className="radar-ring r2" />
            <span className="radar-ring r3" />
            <div className="radar-me">
              <Avatar id={3} size={56} />
              <small>Você</small>
            </div>
            {nearby.slice(0, 6).map((n, i) => {
              const ang = i * 1.05 + 0.4,
                r = n.km < 0.3 ? 22 : n.km < 0.8 ? 32 : 42;
              return (
                <Button
                  variant="ghost"
                  key={n.id}
                  type="button"
                  className={"radar-pin" + (SAMPLE_BOOSTED_PEOPLE.includes(n.id) ? " boosted" : "")}
                  style={{ left: 50 + Math.cos(ang) * r + "%", top: 50 + Math.sin(ang) * r + "%" }}
                  onClick={() => setPick(n.id)}
                  aria-label={n.person.name + " — " + n.activity + ", " + n.label}
                >
                  <Avatar id={n.id} size={44} />
                  <small>{n.person.name.split(" ")[0]}</small>
                </Button>
              );
            })}
          </section>
          <div className="card radar-status">
            <Icon name="pin" />
            <div>
              <b>{label}</b>
              <p className="muted small">
                {activity} · visível por {mins < 60 ? mins + " min" : mins / 60 + "h"} ·{" "}
                {nearby.length} nommi por perto
              </p>
            </div>
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setOn(false);
                setPick(null);
                save({ on: false });
                if (cloudUser)
                  void supabase.from("radar_presence").delete().eq("user_id", cloudUser.id);
              }}
            >
              Sair do radar
            </Button>
          </div>
          {sel && (
            <section className="card radar-card">
              <div className="radar-card-top">
                <Avatar id={sel.id} size={64} />
                <div>
                  <h2>
                    {sel.person.name}, {sel.person.age}
                  </h2>
                  <p className="mode-chip">{sel.activity}</p>
                  <p className="muted small">
                    {sel.place} · {sel.label}
                  </p>
                  <p className="muted small">Curte {sel.person.interests.join(" e ")}</p>
                </div>
              </div>
              {sent.includes(sel.id) ? (
                <p className="radar-ok">
                  Convite enviado. Se {sel.person.name.split(" ")[0]} topar, vocês podem se
                  encontrar numa tribo primeiro.
                </p>
              ) : (
                <div className="radar-actions">
                  <Button
                    type="button"
                    onClick={() => {
                      setSent([...sent, sel.id]);
                      notify("Convite enviado para " + sel.person.name.split(" ")[0] + ".");
                    }}
                  >
                    Topo também
                  </Button>
                  <Button asChild variant="secondary">
                    <Link to="/perfil" search={{ p: sel.id }}>
                      Ver perfil
                    </Link>
                  </Button>
                </div>
              )}
              <p className="muted small">
                Primeiro encontro? Prefira um lugar público e avise alguém de confiança.
              </p>
            </section>
          )}
          {cloudUser && <RealNearby coords={coords} me={cloudUser.id} />}
          <div className="section-heading">
            <h2>{cloudUser ? "Escolha o que você topa" : "Perto de você"}</h2>
          </div>
          <div className="chips">
            {(["", ...ACTIVITIES] as const).map((m) => (
              <Button
                variant="ghost"
                key={m || "todos"}
                type="button"
                className={"chip" + (m === filter ? " active" : "")}
                aria-pressed={m === filter}
                onClick={() => setFilter(m)}
              >
                {m || "Tudo"}
              </Button>
            ))}
          </div>
          {nearby.length ? (
            <div className="activity-list">
              {nearby.map((n) => (
                <Button
                  variant="ghost"
                  type="button"
                  className="activity radar-row"
                  key={n.id}
                  onClick={() => {
                    setPick(n.id);
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                >
                  <Avatar id={n.id} size={44} />
                  <div>
                    <h3>
                      {n.person.name.split(" ")[0]} · topa {n.activity.toLowerCase()}
                    </h3>
                    <p>
                      {n.place} · {n.label}
                    </p>
                  </div>
                  <Icon name="arrow" />
                </Button>
              ))}
            </div>
          ) : (
            <EmptyState
              title="Ninguém por perto com essa vontade agora."
              text="Tente outra opção ou entre numa tribo aberta."
            >
              <Button asChild>
                <Link to="/grupos" hash="teias-abertas">
                  Ver tribos abertas
                </Link>
              </Button>
            </EmptyState>
          )}
        </>
      )}
    </div>
  );
}

type Real = RadarNearby;
/** nommi de verdade por perto, calculado no servidor a partir da posição aproximada. */
function RealNearby({ coords, me }: { coords: { lat: number; lng: number } | null; me: string }) {
  const { notify } = useFriends();
  const [list, setList] = useState<Real[] | null>(null);
  const [sent, setSent] = useState<string[]>([]);
  useEffect(() => {
    if (!coords) {
      setList([]);
      return;
    }
    let alive = true;
    void supabase
      .rpc("radar_nearby", { _lat: coords.lat, _lng: coords.lng, _km: 10 })
      .then(({ data }: { data: unknown }) => {
        if (alive) setList(((data as Real[] | null) ?? []).filter((r) => r.user_id !== me));
      });
    return () => {
      alive = false;
    };
  }, [coords?.lat, coords?.lng, me]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!coords)
    return <p className="small-note">Ligue a localização para ver quem está por perto agora.</p>;
  return (
    <>
      <div className="section-heading">
        <h2>nommi por perto agora</h2>
      </div>
      {list === null ? (
        <p className="small-note">Procurando…</p>
      ) : list.length ? (
        <div className="radar-people">
          {list.map((r) => (
            <article className="radar-person" key={r.user_id}>
              {r.avatar_url ? (
                <img className="story-face" src={r.avatar_url} alt="" width={48} height={48} />
              ) : (
                <Avatar id={3} size={48} />
              )}
              <div>
                <h3>{r.nickname || "nommi"}</h3>
                <p className="muted small">
                  topa {String(r.activity || "").toLowerCase()} · {r.place_name}
                  {r.city ? " · " + r.city : ""}
                </p>
                <p className="muted small">{kmLabel(Number(r.km))}</p>
              </div>
              {sent.includes(r.user_id) ? (
                <span className="boost-badge">
                  <Icon name="check" />
                  Enviado
                </span>
              ) : (
                <Button
                  size="sm"
                  onClick={() => {
                    setSent([...sent, r.user_id]);
                    notify("Interesse enviado. Combine pelo perfil ou por uma tribo em comum.");
                  }}
                >
                  Topo também
                </Button>
              )}
              <Button asChild variant="ghost" size="sm">
                <Link to="/nommi/$id" params={{ id: r.user_id }}>
                  Ver perfil
                </Link>
              </Button>
            </article>
          ))}
        </div>
      ) : (
        <p className="small-note">
          Ainda ninguém com o radar ligado por perto. Você aparece para quem chegar depois.
        </p>
      )}
    </>
  );
}
