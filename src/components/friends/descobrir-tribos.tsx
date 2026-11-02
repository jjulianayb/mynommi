import { useCallback, useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import type { SupabaseClient } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import type { RealTeiaRow } from "@/lib/real-teias";
import { publicUrl } from "@/lib/covers";
import { iconeDoInteresse } from "@/lib/figurinhas";
import { Icon, Sticker } from "./art";

const db = supabase as unknown as SupabaseClient;

/** Tribo da vitrine da Descobrir: o essencial para a pessoa querer entrar. */
export type TriboSugerida = {
  id: number;
  nome: string;
  categoria: string;
  membros: number;
  capa: string;
  sobre: string;
};

const semAcento = (s: string) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").trim().toLowerCase();

/**
 * As tribos que podem ser a cara da pessoa: primeiro as que casam com um
 * interesse dela, depois as maiores. Só tribos que ela ainda não entrou.
 * Rolês (kind "role") ficam de fora: aqui é comunidade, não evento.
 */
export function sugerirTribos(
  rows: RealTeiaRow[],
  interesses: string[],
  limite = 8,
): TriboSugerida[] {
  const minhas = new Set(interesses.map(semAcento));
  const candidatas = rows
    .filter((r) => r.kind !== "role" && !r.i_am_member)
    .map((r) => {
      const cat = (r.category ?? "").trim();
      const casa = cat !== "" && minhas.has(semAcento(cat));
      return { r, cat, casa };
    })
    .sort((a, b) =>
      a.casa === b.casa
        ? (b.r.member_count ?? 0) - (a.r.member_count ?? 0)
        : a.casa
          ? -1
          : 1,
    );
  return candidatas.slice(0, Math.max(0, limite)).map(({ r, cat }) => ({
    id: r.id,
    nome: r.name,
    categoria: cat,
    membros: r.member_count ?? 0,
    capa: r.cover_path ? publicUrl(r.cover_path) : "",
    sobre: (r.about ?? "").trim(),
  }));
}

export function useTribosSugeridas(me: string | null) {
  const [lista, setLista] = useState<TriboSugerida[]>([]);
  const [ready, setReady] = useState(false);
  const carregar = useCallback(async () => {
    if (!me) {
      setReady(true);
      return;
    }
    const [{ data }, { data: eu }] = await Promise.all([
      db.rpc("list_teias", {}),
      db.from("profiles").select("interests").eq("id", me).maybeSingle(),
    ]);
    const interesses = ((eu as { interests?: string[] } | null)?.interests ?? []) as string[];
    setLista(sugerirTribos((data as RealTeiaRow[] | null) ?? [], interesses));
    setReady(true);
  }, [me]);
  useEffect(() => {
    void carregar();
  }, [carregar]);
  return { lista, ready };
}

/**
 * Trilho "Tribos que podem ser sua cara": capas grandes, ritmo de revista,
 * cada carta abre a página da tribo. A última carta leva para o catálogo.
 */
export function TrilhoTribos({ me }: { me: string }) {
  const { lista, ready } = useTribosSugeridas(me);
  if (!ready || lista.length === 0) return null;
  return (
    <section className="dc-tribos" aria-label="Tribos que podem ser sua cara">
      <h3 className="dc-secao-titulo">Tribos que podem ser sua cara</h3>
      <div className="dc-trilho">
        {lista.map((t, i) => (
          <Link
            key={t.id}
            to="/grupos/$id"
            params={{ id: String(t.id) }}
            className={"dc-tribo" + (i === 0 ? " destaque" : "")}
            aria-label={`Conhecer a tribo ${t.nome}`}
          >
            <span className="dc-tribo-capa">
              {t.capa ? (
                <img src={t.capa} alt="" loading="lazy" />
              ) : (
                <Sticker id={i % 16} size={64} semLegenda />
              )}
            </span>
            <span className="dc-tribo-txt">
              {t.categoria && (
                <span className="dc-tribo-cat">
                  <Icon name={iconeDoInteresse(t.categoria)} />
                  {t.categoria}
                </span>
              )}
              <strong>{t.nome}</strong>
              <span className="dc-tribo-membros">
                {t.membros === 1 ? "1 pessoa" : `${t.membros} pessoas`}
              </span>
            </span>
          </Link>
        ))}
        <Link to="/grupos" className="dc-tribo catalogo">
          <span className="dc-tribo-txt">
            <strong>Explorar Tribos</strong>
            <span className="dc-tribo-membros">ver todas as comunidades</span>
          </span>
          <Icon name="arrow" />
        </Link>
      </div>
    </section>
  );
}
