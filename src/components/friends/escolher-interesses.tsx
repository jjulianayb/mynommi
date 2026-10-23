import { useState } from "react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import {
  figurinhaDe,
  figurinhasDoGrupo,
  gruposDeFigurinhas,
  mesmoInteresse,
} from "@/lib/figurinhas";
import { useFriends } from "./store";

export const MAX_INTERESSES = 12;

/**
 * Interesse se escolhe tocando na figurinha. Quanto mais a pessoa marca,
 * melhor o match fica — então aqui não existe limite de três como no cadastro.
 */
export function EscolherInteresses({
  me,
  atuais,
  onSalvo,
}: {
  me: string;
  atuais: string[];
  onSalvo: () => void;
}) {
  const { notify } = useFriends();
  const [escolhidos, setEscolhidos] = useState<string[]>(atuais);
  const [salvando, setSalvando] = useState(false);
  const cheio = escolhidos.length >= MAX_INTERESSES;

  const marcado = (nome: string) => escolhidos.some((e) => mesmoInteresse(e, nome));
  const alternar = (nome: string) =>
    setEscolhidos((v) =>
      v.some((e) => mesmoInteresse(e, nome))
        ? v.filter((e) => !mesmoInteresse(e, nome))
        : v.length >= MAX_INTERESSES
          ? v
          : [...v, nome],
    );

  async function salvar() {
    setSalvando(true);
    const { error } = await supabase
      .from("profiles")
      .update({ interests: escolhidos.slice(0, MAX_INTERESSES) })
      .eq("id", me);
    setSalvando(false);
    notify(error ? "Não deu para salvar agora." : "Interesses salvos.");
    if (!error) onSalvo();
  }

  return (
    <div className="figurinhas">
      <p className="small-note">
        Toque nas figurinhas do que você gosta. Quanto mais você marcar, melhor a nommi acerta quem
        combina com você.
      </p>

      {escolhidos.length > 0 && (
        <div className="meus-interesses">
          {escolhidos.map((i) => (
            <span key={i}>
              {figurinhaDe(i)} {i}
            </span>
          ))}
        </div>
      )}
      <p className="figurinhas-conta">
        {escolhidos.length} de {MAX_INTERESSES} escolhidos
        {cheio && " — tire um para colocar outro."}
      </p>

      {gruposDeFigurinhas().map((g) => (
        <div className="figurinhas-grupo" key={g}>
          <h3>{g}</h3>
          <div className="figurinhas-grade">
            {figurinhasDoGrupo(g).map((f) => (
              <button
                type="button"
                key={f.nome}
                className={"fig" + (marcado(f.nome) ? " marcada" : "")}
                aria-pressed={marcado(f.nome)}
                disabled={cheio && !marcado(f.nome)}
                onClick={() => alternar(f.nome)}
              >
                <b>{f.fig}</b>
                {f.nome}
              </button>
            ))}
          </div>
        </div>
      ))}

      <Button type="button" onClick={() => void salvar()} disabled={salvando}>
        {salvando ? "Salvando…" : "Salvar meus interesses"}
      </Button>
    </div>
  );
}
