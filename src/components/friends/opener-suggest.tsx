import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Button } from "@/components/ui/button";
import { suggestOpeners } from "@/lib/openers.functions";
import { Icon } from "./art";
import { useFriends } from "./store";

const options = [
  "karaokê",
  "vinho",
  "séries",
  "viagens",
  "trilhas",
  "culinária",
  "games",
  "livros",
  "café",
  "corrida",
  "anos 80",
  "pets",
];

/** Pick shared interests and get AI-suggested first messages for a person. */
export function OpenerSuggest({
  personId,
  name,
  interests,
}: {
  personId: number;
  name: string;
  interests: string[];
}) {
  const { state, setState, notify } = useFriends();
  const run = useServerFn(suggestOpeners);
  const [shared, setShared] = useState<string[]>(() =>
    interests.filter((i) => state.interests.includes(i)),
  );
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [list, setList] = useState<string[]>([]);
  const [error, setError] = useState("");
  const all = Array.from(new Set([...interests, ...state.interests, ...options]));
  async function go() {
    if (!shared.length) {
      setError("Escolha pelo menos um interesse em comum.");
      return;
    }
    setBusy(true);
    setError("");
    setList([]);
    try {
      const r = await run({
        data: { name: name.split(" ")[0] ?? name, shared, note: note || undefined },
      });
      if (r.error) setError(r.error);
      setList(r.openers);
    } catch {
      setError("Não foi possível sugerir mensagens agora.");
    } finally {
      setBusy(false);
    }
  }
  function use(text: string) {
    setState((s) => ({
      ...s,
      messages: {
        ...s.messages,
        [personId]: [...(s.messages[personId] ?? []), { text, mine: true }],
      },
    }));
    notify("Mensagem enviada para " + name.split(" ")[0] + ".");
  }
  return (
    <section className="opener-box">
      <h2>
        <Icon name="spark" />
        Puxar assunto
      </h2>
      <p className="small-note">
        Marque o que vocês têm em comum e receba ideias de primeira mensagem.
      </p>
      <div className="chips">
        {all.map((i) => (
          <Button
            key={i}
            type="button"
            size="sm"
            variant={shared.includes(i) ? "default" : "secondary"}
            aria-pressed={shared.includes(i)}
            onClick={() => setShared((s) => (s.includes(i) ? s.filter((x) => x !== i) : [...s, i]))}
          >
            {i}
          </Button>
        ))}
      </div>
      <input
        className="input"
        value={note}
        maxLength={200}
        placeholder="Algo mais? Ex.: vimos o mesmo show"
        onChange={(e) => setNote(e.target.value)}
      />
      <Button className="wide" disabled={busy} onClick={go}>
        <Icon name="spark" />
        {busy ? "Pensando em boas ideias…" : "Sugerir mensagens"}
      </Button>
      {error && (
        <p role="alert" className="form-error">
          {error}
        </p>
      )}
      {list.map((t) => (
        <div className="opener-item" key={t}>
          <p>{t}</p>
          <Button size="sm" variant="secondary" onClick={() => use(t)}>
            Enviar
          </Button>
        </div>
      ))}
      {list.length > 0 && (
        <p className="small-note">Sugestões feitas por IA. Revise antes de enviar.</p>
      )}
    </section>
  );
}
