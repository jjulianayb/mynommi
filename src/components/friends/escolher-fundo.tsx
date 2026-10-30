import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { GRUPOS_DE_FUNDO, fundosDoGrupo, miniaturaDoFundo } from "@/lib/fundos";
import { useFriends } from "./store";

/**
 * O fundo da própria página. É o que aparece atrás de você no match —
 * por isso escolher aqui muda o que os outros veem, não só a sua tela.
 */
export function EscolherFundo({
  me,
  atual,
  onSalvo,
}: {
  me: string;
  atual: string;
  onSalvo: () => void;
}) {
  const { notify } = useFriends();
  const [salvando, setSalvando] = useState("");

  async function escolher(id: string) {
    setSalvando(id);
    const { error } = await supabase.from("profiles").update({ background_path: id }).eq("id", me);
    setSalvando("");
    if (error) {
      notify("Não deu para salvar o fundo agora.");
      return;
    }
    notify("Pronto. É esse o fundo que as pessoas vão ver atrás de você.");
    onSalvo();
  }

  return (
    <>
      <p className="small-note">
        O fundo escolhido aparece na sua página e atrás de você quando alguém te vê no match.
      </p>
      {GRUPOS_DE_FUNDO.map((g) => (
        <div className="fundos-grupo" key={g}>
          <h3>{g}</h3>
          <div className="fundos">
            {fundosDoGrupo(g).map((f) => (
              <button
                type="button"
                key={f.id}
                className={
                  "fundo-opcao " +
                  f.tom +
                  (atual === f.id ? " escolhido" : "") +
                  (salvando === f.id ? " salvando" : "")
                }
                style={miniaturaDoFundo(f)}
                aria-pressed={atual === f.id}
                onClick={() => void escolher(f.id)}
              >
                <span>{f.nome}</span>
              </button>
            ))}
          </div>
        </div>
      ))}
    </>
  );
}
