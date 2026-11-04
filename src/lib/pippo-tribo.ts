import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

/** Conta-sistema do Pippo (sem login, invisível em buscas e números) e a Tribo do Pippo. */
export const PIPPO_ID = "a0000000-0000-4000-8000-0000000000f1";
export const TRIBO_DO_PIPPO_ID = 100024;

export const ehDoPippo = (senderId: string | undefined) => senderId === PIPPO_ID;

/**
 * O Pippo puxa assunto quando alguém abre a tribo.
 *
 * Pedido da Ju (04/11): "ele lança um assunto, ele lança um quiz, porque aí faz
 * as pessoas conversarem e se conhecerem."
 *
 * **Quem dispara é a visita, não um horário marcado.** De propósito: pergunta
 * lançada às três da manhã numa sala vazia é pergunta perdida, e personagem
 * que fala quando tem gente parece mais com gente. Também não precisa de
 * agendador nenhum, que é uma peça a menos para quebrar sem ninguém ver.
 *
 * O texto **não sai daqui**: quem escolhe é a função no banco, que lê a lista
 * de `assuntos_do_pippo`. Se a tela mandasse o texto, qualquer pessoa poderia
 * fazer o Pippo dizer qualquer coisa.
 *
 * O intervalo (20 h) também é do banco. A tela pode chamar à vontade: fora da
 * hora a função devolve nada e não escreve.
 */
export function usePippoPuxaAssunto(
  teiaId: number,
  pronto: boolean,
  souMembro: boolean,
  aoFalar: () => void,
) {
  const jaPedi = useRef(false);
  useEffect(() => {
    if (teiaId !== TRIBO_DO_PIPPO_ID || !pronto || !souMembro || jaPedi.current) return;
    jaPedi.current = true;
    void supabase.rpc("pippo_puxa_assunto").then(({ data }) => {
      // Só recarrega quando ele realmente falou. Fora da hora não há nada novo
      // e recarregar seria uma consulta a cada abertura da tribo.
      if (data) aoFalar();
    });
  }, [teiaId, pronto, souMembro, aoFalar]);
}
