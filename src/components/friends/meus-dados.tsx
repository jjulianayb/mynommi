import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import type { SupabaseClient } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { Icon } from "./art";
import { Sheet } from "./surfaces";
import { useFriends } from "./store";
import { useDemoSession } from "./session";

/** meus_dados e apagar_minha_conta ainda não estão em types.ts. */
const db = supabase as unknown as SupabaseClient;

/** O arquivo que a pessoa leva embora. Nome com a data, para ela saber de quando é. */
export function nomeDoArquivo(hoje = new Date()) {
  return `nommi-meus-dados-${hoje.toISOString().slice(0, 10)}.json`;
}

/**
 * Dois direitos que a lei dá e que o app precisa entregar sem intermediário:
 * levar os dados embora e apagar a conta. Nenhum dos dois pode depender de
 * mandar e-mail para alguém e esperar boa vontade.
 */
export function MeusDireitos() {
  const { notify } = useFriends();
  const { signOut } = useDemoSession();
  const navigate = useNavigate();
  const [baixando, setBaixando] = useState(false);
  const [confirmar, setConfirmar] = useState(false);
  const [palavra, setPalavra] = useState("");
  const [apagando, setApagando] = useState(false);

  async function baixar() {
    setBaixando(true);
    const { data, error } = await db.rpc("meus_dados");
    setBaixando(false);
    if (error || !data) {
      notify("Não foi possível montar seu arquivo agora. Tente de novo.");
      return;
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = nomeDoArquivo();
    a.click();
    URL.revokeObjectURL(url);
    notify("Seu arquivo foi baixado.");
  }

  async function apagar() {
    setApagando(true);
    const { error } = await db.rpc("apagar_minha_conta");
    if (error) {
      setApagando(false);
      notify("Não foi possível apagar agora. Tente de novo em alguns minutos.");
      return;
    }
    await signOut();
    void navigate({ to: "/", replace: true });
  }

  return (
    <>
      <h2 className="settings-subtitle">Seus dados</h2>
      <div className="meus-direitos">
        <Button variant="ghost" className="sheet-option" disabled={baixando} onClick={baixar}>
          <span className="tone-icon blue">
            <Icon name="send" />
          </span>
          <span>
            {baixando ? "Montando seu arquivo…" : "Baixar meus dados"}
            <small>Tudo o que a nommi tem sobre você, num arquivo só.</small>
          </span>
        </Button>
        <Button
          variant="ghost"
          className="sheet-option danger-text"
          onClick={() => setConfirmar(true)}
        >
          <span className="tone-icon yellow">
            <Icon name="trash" />
          </span>
          <span>
            Apagar minha conta
            <small>Perfil, conversas, fotos e tribos. Some na hora, sem volta.</small>
          </span>
        </Button>
      </div>
      {confirmar && (
        <Sheet title="Apagar sua conta?" onClose={() => setConfirmar(false)}>
          <div className="delete-confirm">
            <p>
              Some tudo: seu perfil, suas conversas, suas fotos, seus vídeos e sua participação nas
              tribos. Não tem como desfazer, e a gente não guarda cópia para você se arrepender.
            </p>
            <p>
              Se quiser levar suas coisas antes, feche isto e toque em <b>Baixar meus dados</b>.
            </p>
            <label>
              Digite APAGAR para confirmar
              <input
                className="input"
                value={palavra}
                onChange={(e) => setPalavra(e.target.value)}
                maxLength={10}
                autoComplete="off"
              />
            </label>
            <Button
              className="wide"
              disabled={palavra !== "APAGAR" || apagando}
              onClick={() => void apagar()}
            >
              {apagando ? "Apagando…" : "Apagar minha conta"}
            </Button>
            <Button className="wide" variant="secondary" onClick={() => setConfirmar(false)}>
              Manter minha conta
            </Button>
          </div>
        </Sheet>
      )}
    </>
  );
}
