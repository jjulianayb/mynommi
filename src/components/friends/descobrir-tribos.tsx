import { useCallback, useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import type { SupabaseClient } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import type { RealTeiaRow } from "@/lib/real-teias";
import { publicUrl } from "@/lib/covers";
import { iconeDoInteresse } from "@/lib/figurinhas";
import { Icon } from "./art";

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
 * Capas ilustradas que a Ju recortou do mockup (02/11): são dela e cobrem as
 * tribos-oficiais mais conhecidas. A capa real enviada pela tribo sempre vem
 * primeiro; a ilustração entra quando a tribo ainda não tem capa própria.
 */
const CAPAS_DA_JU: Record<string, string> = {
  "cinema & series": "/capas-tribos/cinema-e-series.png",
  "cinema e series": "/capas-tribos/cinema-e-series.png",
  viagens: "/capas-tribos/viagens.png",
  musica: "/capas-tribos/musica.png",
  "bem-estar": "/capas-tribos/bem-estar.png",
  "bem estar": "/capas-tribos/bem-estar.png",
  livros: "/capas-tribos/livros.png",
};

export function capaDaTribo(nome: string, coverPath: string | null): string {
  if (coverPath) return publicUrl(coverPath);
  return CAPAS_DA_JU[semAcento(nome)] ?? "";
}

function paraSugerida(r: RealTeiaRow): TriboSugerida {
  return {
    id: r.id,
    nome: r.name,
    categoria: (r.category ?? "").trim(),
    membros: r.member_count ?? 0,
    capa: capaDaTribo(r.name, r.cover_path ?? null),
    sobre: (r.about ?? "").trim(),
  };
}

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
  return candidatas.slice(0, Math.max(0, limite)).map(({ r }) => paraSugerida(r));
}

/** As tribos de que a pessoa já faz parte, na ordem das maiores. */
export function minhasTribos(rows: RealTeiaRow[], limite = 10): TriboSugerida[] {
  return rows
    .filter((r) => r.i_am_member && r.kind !== "role")
    .sort((a, b) => (b.member_count ?? 0) - (a.member_count ?? 0))
    .slice(0, Math.max(0, limite))
    .map(paraSugerida);
}

function useTeias(me: string | null) {
  const [rows, setRows] = useState<RealTeiaRow[]>([]);
  const [interesses, setInteresses] = useState<string[]>([]);
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
    setRows((data as RealTeiaRow[] | null) ?? []);
    setInteresses(
      (((eu as { interests?: string[] } | null)?.interests ?? []) as string[]),
    );
    setReady(true);
  }, [me]);
  useEffect(() => {
    void carregar();
  }, [carregar]);
  return { rows, interesses, ready };
}

/** Contagem real e curta, como no mockup (12k, 8k). */
function contagemCurta(n: number): string {
  if (n >= 1000) return `${Math.floor(n / 100) / 10}k`.replace(".0k", "k");
  return String(n);
}

/** Capa quadrada: foto real, ilustração da Ju ou monograma honesto. */
function CapaTribo({ t }: { t: TriboSugerida }) {
  const [quebrou, setQuebrou] = useState(false);
  if (t.capa && !quebrou)
    return (
      <img src={t.capa} alt="" loading="lazy" onError={() => setQuebrou(true)} />
    );
  return (
    <span className="dc-tribo-mono" aria-hidden="true">
      {t.nome.trim().charAt(0).toUpperCase() || "N"}
    </span>
  );
}

/**
 * "Suas tribos": as comunidades da pessoa logo abaixo das fotos, com capa
 * quadrada, nome e contagem real — o trilho do mockup da Ju (02/11).
 */
export function TrilhoMinhasTribos({ me }: { me: string }) {
  const { rows, ready } = useTeias(me);
  if (!ready) return null;
  const lista = minhasTribos(rows);
  if (lista.length === 0) return null;
  return (
    <section className="dc-minhas-tribos" aria-label="Suas tribos">
      <div className="dc-minhas-tribos-topo">
        <h3 className="dc-secao-titulo">
          <Icon name="users" />
          Suas tribos
        </h3>
        <Link to="/grupos" className="dc-ver-todas">
          Ver todas
          <Icon name="arrow" />
        </Link>
      </div>
      <div className="dc-trilho">
        {lista.map((t) => (
          <Link
            key={t.id}
            to="/grupos/$id"
            params={{ id: String(t.id) }}
            className="dc-minha-tribo"
            aria-label={`Abrir a tribo ${t.nome}`}
          >
            <span className="dc-minha-tribo-capa">
              <CapaTribo t={t} />
            </span>
            <span className="dc-minha-tribo-txt">
              <strong>{t.nome}</strong>
              <span className="dc-tribo-membros">{contagemCurta(t.membros)}</span>
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}

/**
 * O convite verde do mockup: quem ainda não achou sua tribo descobre o
 * catálogo aqui. Sempre visível, mesmo para quem já tem tribos.
 */
export function BannerTribos() {
  return (
    <section className="dc-banner-tribos" aria-label="Explorar tribos">
      <div className="dc-banner-tribos-txt">
        <h3>Alguma tribo te esperando?</h3>
        <p>Descubra comunidades incríveis e faça novas conexões.</p>
      </div>
      <Link to="/grupos" className="dc-banner-tribos-cta">
        Explorar Tribos
        <Icon name="arrow" />
      </Link>
    </section>
  );
}

/**
 * Trilho "Tribos que podem ser sua cara": capas grandes, ritmo de revista,
 * cada carta abre a página da tribo. A última carta leva para o catálogo.
 */
export function TrilhoTribos({ me }: { me: string }) {
  const { rows, interesses, ready } = useTeias(me);
  if (!ready) return null;
  const lista = sugerirTribos(rows, interesses);
  if (lista.length === 0) return null;
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
              <CapaTribo t={t} />
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
