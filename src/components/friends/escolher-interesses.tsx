import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
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
  const [buscando, setBuscando] = useState(false);
  const [falha, setFalha] = useState(false);
  const [pessoas, setPessoas] = useState<{ id: string; nickname: string; interests: string[] }[]>(
    [],
  );
  useEffect(() => {
    let alive = true;
    if (!escolhidos.length) {
      setPessoas([]);
      return;
    }
    setBuscando(true);
    setFalha(false);
    const t = setTimeout(async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id,nickname,interests")
        .eq("profile_mode", "publico")
        .eq("is_business", false)
        .eq("is_test", false)
        .neq("id", me)
        .overlaps("interests", escolhidos)
        .limit(20);
      if (alive) {
        setBuscando(false);
        setFalha(!!error);
        setPessoas(
          (data ?? [])
            .sort(
              (a, b) =>
                b.interests.filter((i) => escolhidos.includes(i)).length -
                a.interests.filter((i) => escolhidos.includes(i)).length,
            )
            .slice(0, 4),
        );
      }
    }, 350);
    return () => {
      alive = false;
      clearTimeout(t);
    };
  }, [escolhidos, me]);
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

      {escolhidos.length > 0 && (
        <section aria-live="polite" className="interesses-sugestoes">
          <h3>Vocês têm isso em comum</h3>
          <p className="small-note">
            As sugestões mudam enquanto você escolhe. Salve antes de sair desta tela.
          </p>
          {buscando ? (
            <p className="small-note">Procurando interesses em comum…</p>
          ) : falha ? (
            <p className="small-note">
              Não deu para buscar pessoas agora. Seus interesses ainda podem ser salvos.
            </p>
          ) : pessoas.length ? (
            pessoas.map((p) => (
              <Link key={p.id} to="/nommi/$id" params={{ id: p.id }} className="conversation">
                <div>
                  <strong>{p.nickname}</strong>
                  <p>{p.interests.filter((i) => escolhidos.includes(i)).join(" · ")}</p>
                </div>
              </Link>
            ))
          ) : (
            <p className="small-note">
              Ainda não encontramos alguém com essas escolhas. Marque outros interesses ou volte
              depois.
            </p>
          )}
        </section>
      )}
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
