import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { PippoRosto } from "@/components/friends/pippo";
import { TRIBO_DO_PIPPO_ID } from "@/lib/pippo-tribo";

const CHAVE = "nommi-convite-pippo-dispensado";

/** Convite do Pippo no Início: quem já tem conta entra na tribo dele se quiser. */
export function ConvitePippo({ me, nickname }: { me: string; nickname: string }) {
  const [estado, setEstado] = useState<"carregando" | "convite" | "dentro" | "oculto">("carregando");
  useEffect(() => {
    if (typeof window !== "undefined" && window.localStorage.getItem(CHAVE + me)) {
      setEstado("oculto");
      return;
    }
    void supabase
      .from("teia_members")
      .select("user_id")
      .eq("teia_key", String(TRIBO_DO_PIPPO_ID))
      .eq("user_id", me)
      .maybeSingle()
      .then(({ data }) => setEstado(data ? "oculto" : "convite"));
  }, [me]);
  if (estado === "carregando" || estado === "oculto") return null;
  async function entrar() {
    const { error } = await supabase
      .from("teia_members")
      .upsert({ teia_key: String(TRIBO_DO_PIPPO_ID), user_id: me, nickname: nickname.slice(0, 40) });
    if (!error) setEstado("dentro");
  }
  function agoraNao() {
    window.localStorage.setItem(CHAVE + me, "1");
    setEstado("oculto");
  }
  return (
    <section className="convite-pippo" style={{ display: "flex", gap: 12, alignItems: "center", margin: "12px 16px", padding: 12, borderRadius: 18, background: "var(--butter)" }}>
      <PippoRosto altura={64} />
      <div style={{ flex: 1 }}>
        {estado === "convite" ? (
          <>
            <strong>Entra na minha tribo?</strong>
            <p style={{ fontSize: 13 }}>Jogos, quizzes e desafios para conhecer a galera. Você sai quando quiser.</p>
            <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
              <button type="button" onClick={entrar} style={{ minHeight: 44, padding: "0 16px", borderRadius: 999, border: 0, background: "var(--primary)", color: "#fff", fontWeight: 700 }}>
                Entrar
              </button>
              <button type="button" onClick={agoraNao} style={{ minHeight: 44, padding: "0 12px", border: 0, background: "transparent", fontWeight: 600 }}>
                Agora não
              </button>
            </div>
          </>
        ) : (
          <>
            <strong>Você entrou na Tribo do Pippo!</strong>
            <p style={{ fontSize: 13 }}>
              <Link to="/grupos/$id" params={{ id: String(TRIBO_DO_PIPPO_ID) }}>Ver a tribo</Link>
            </p>
          </>
        )}
      </div>
    </section>
  );
}
