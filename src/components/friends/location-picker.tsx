import { useEffect, useMemo, useState } from "react";

type Data = typeof import("country-state-city");
const regionName = (() => {
  try {
    const d = new Intl.DisplayNames(["pt-BR"], { type: "region" });
    return (c: string, f: string) => d.of(c) ?? f;
  } catch {
    return (_: string, f: string) => f;
  }
})();

/** Cascading country → state → city picker. Data loads lazily in the browser. */
export function LocationPicker({ onChange }: { onChange: (label: string) => void }) {
  const [lib, setLib] = useState<Data | null>(null);
  const [country, setCountry] = useState("BR");
  const [state, setState] = useState("");
  const [city, setCity] = useState("");
  useEffect(() => {
    import("country-state-city").then(setLib);
  }, []);
  const countries = useMemo(
    () =>
      lib
        ? lib.Country.getAllCountries()
            .map((c) => ({ code: c.isoCode, name: regionName(c.isoCode, c.name) }))
            .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"))
        : [],
    [lib],
  );
  const states = useMemo(() => (lib ? lib.State.getStatesOfCountry(country) : []), [lib, country]);
  const cities = useMemo(
    () => (lib && state ? lib.City.getCitiesOfState(country, state) : []),
    [lib, country, state],
  );
  useEffect(() => {
    const st = states.find((s) => s.isoCode === state);
    const cn = countries.find((c) => c.code === country)?.name ?? "";
    onChange(city && st ? `${city}, ${st.isoCode.length <= 3 ? st.isoCode : st.name} · ${cn}` : "");
  }, [city, state, country, states, countries, onChange]);
  if (!lib) return <p className="small-note">Carregando países…</p>;
  return (
    <div className="location-picker">
      <label>
        País
        <select
          className="input"
          value={country}
          onChange={(e) => {
            setCountry(e.target.value);
            setState("");
            setCity("");
          }}
        >
          {countries.map((c) => (
            <option key={c.code} value={c.code}>
              {c.name}
            </option>
          ))}
        </select>
      </label>
      <label>
        Estado
        <select
          className="input"
          value={state}
          disabled={!states.length}
          onChange={(e) => {
            setState(e.target.value);
            setCity("");
          }}
        >
          <option value="">{states.length ? "Escolha o estado" : "Sem estados cadastrados"}</option>
          {states.map((s) => (
            <option key={s.isoCode} value={s.isoCode}>
              {s.name}
            </option>
          ))}
        </select>
      </label>
      <label>
        Cidade
        <select
          className="input"
          value={city}
          disabled={!cities.length}
          onChange={(e) => setCity(e.target.value)}
        >
          <option value="">{state ? "Escolha a cidade" : "Escolha o estado primeiro"}</option>
          {cities.map((c) => (
            <option key={c.name} value={c.name}>
              {c.name}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
