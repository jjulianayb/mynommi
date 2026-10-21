import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { EmptyState } from "./surfaces";
import { useDemoSession } from "./session";
import { DirectChat } from "./direct-chat";
import { supabase } from "@/integrations/supabase/client";

/** Abre a conversa a sós com uma pessoa, buscando o nome e a foto dela. */
export function DirectChatPage({ id }: { id: string }) {
  const { cloudUser, demoMode } = useDemoSession();
  const real = !!cloudUser && !demoMode;
  const [quem, setQuem] = useState<{ nickname: string; avatar_url: string } | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!real) return;
    void supabase
      .from("profiles")
      .select("nickname,avatar_url")
      .eq("id", id)
      .maybeSingle()
      .then(({ data }) => {
        setQuem((data as { nickname: string; avatar_url: string } | null) ?? null);
        setReady(true);
      });
  }, [id, real]);

  if (!real)
    return (
      <EmptyState
        title="Entre na sua conta para conversar."
        text="As conversas a sós são entre contas reais."
      >
        <Button asChild>
          <Link to="/conta">Entrar</Link>
        </Button>
      </EmptyState>
    );
  if (!ready) return <p className="small-note">Abrindo a conversa…</p>;
  if (!quem)
    return (
      <EmptyState
        title="Esta pessoa não está disponível."
        text="O perfil pode ter sido apagado, ou vocês não são mais amizade."
      >
        <Button asChild variant="secondary">
          <Link to="/conversas">Voltar para conversas</Link>
        </Button>
      </EmptyState>
    );

  return (
    <DirectChat
      me={cloudUser!.id}
      outroId={id}
      nickname={quem.nickname || "nommi"}
      avatar={quem.avatar_url || ""}
    />
  );
}
