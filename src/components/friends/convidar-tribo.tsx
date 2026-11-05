import { useState } from "react";
import { Button } from "@/components/ui/button";
import { meuConvite } from "@/lib/chegada";
import { enderecoDoWhatsApp, linkParaTribo, textoParaTribo } from "@/lib/convite-em-lote";
import { linkDaTribo, textoDeDivulgacao } from "@/lib/tribo-da-dona";
import { Icon } from "./art";
import { useFriends } from "./store";

/**
 * Convidar direto da página da tribo.
 *
 * O pedido nasceu de uma dúvida real: quem divulga a nommi nas redes não
 * achava como levar a pessoa para dentro da própria tribo — o link antigo só
 * abria o cadastro. Aqui o link já carrega a tribo, e quem cria a conta por
 * ele cai dentro dela.
 *
 * Dois formatos, escolhidos sozinhos:
 *
 * - **dona com a página pública ligada**: o link da página, que vale para
 *   muita gente (código de convite vale uma vez só e acabaria no primeiro
 *   clique de um post aberto);
 * - **todo o resto**: o convite pessoal com código, que ainda cria a amizade
 *   com quem convidou.
 */
export function ConvidarTribo({
  me,
  nickname,
  triboId,
  nome,
  cidade,
  souCriadora,
  paginaNoAr,
}: {
  me: string;
  nickname: string;
  triboId: number;
  nome: string;
  cidade: string;
  souCriadora: boolean;
  paginaNoAr: boolean;
}) {
  const { notify } = useFriends();
  const [copiando, setCopiando] = useState(false);
  const usarPaginaPublica = souCriadora && paginaNoAr;

  async function textoDoConvite(): Promise<{ texto: string; recado: string } | null> {
    if (usarPaginaPublica) {
      const link = linkDaTribo(window.location.origin, triboId);
      return {
        texto: textoDeDivulgacao(nome, cidade, link),
        recado:
          "Link da tribo copiado. Quem abrir vê a tribo e já cai dentro dela depois de criar a conta.",
      };
    }
    const codigo = await meuConvite(me, nickname);
    if (!codigo) return null;
    const link = linkParaTribo(window.location.origin, codigo, triboId);
    return {
      texto: textoParaTribo(nickname, link, nome),
      recado: "Convite copiado. Quem criar a conta por ele já cai nesta tribo.",
    };
  }

  async function copiar() {
    if (copiando) return;
    setCopiando(true);
    try {
      const c = await textoDoConvite();
      if (!c) {
        notify("Não deu para montar o convite agora. Tente de novo.");
        return;
      }
      try {
        await navigator.clipboard.writeText(c.texto);
        notify(c.recado);
      } catch {
        notify("Não deu para copiar aqui. Tente pelo WhatsApp.");
      }
    } finally {
      setCopiando(false);
    }
  }

  async function noWhatsApp() {
    const c = await textoDoConvite();
    if (!c) {
      notify("Não deu para montar o convite agora. Tente de novo.");
      return;
    }
    window.open(enderecoDoWhatsApp(c.texto), "_blank", "noopener");
  }

  return (
    <div className="convidar-tribo">
      <Button variant="outline" onClick={() => void copiar()} disabled={copiando}>
        <Icon name="link" />
        {copiando ? "Copiando…" : "Convidar"}
      </Button>
      <Button variant="ghost" onClick={() => void noWhatsApp()} aria-label="Convidar pelo WhatsApp">
        <Icon name="send" />
      </Button>
    </div>
  );
}
