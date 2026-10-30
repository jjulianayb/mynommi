import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { meuConvite } from "@/lib/chegada";
import {
  MAX_CONVITES_POR_VEZ,
  enderecoDoWhatsApp,
  linkParaTribo,
  recadoDoLote,
  textoParaTribo,
} from "@/lib/convite-em-lote";
import { faltamParaAPorta } from "@/lib/porta-que-abre";
import { useMinhasTribos } from "@/lib/minhas-tribos";
import { Icon } from "./art";
import { useFriends } from "./store";
import {
  convidaMais,
  fraseDosConvites,
  selodeEmbaixadora,
  useMeuTitulo,
} from "@/lib/embaixadora";

/**
 * Convidar em lote.
 *
 * Um toque abre o WhatsApp com o texto pronto; a pessoa escolhe para quem
 * mandar e volta. O contador existe para dar ritmo: convidar cinquenta vira
 * uma tarefa com fim, não um poço sem fundo.
 *
 * A nommi não pede a sua agenda de contatos. Quem escolhe quem recebe é você,
 * dentro do seu WhatsApp.
 */
export function ConvidarEmLote({ me, nickname }: { me: string; nickname: string }) {
  const { notify } = useFriends();
  const { tribos } = useMinhasTribos(true);
  const [codigo, setCodigo] = useState<string | null>(null);
  const [alvo, setAlvo] = useState<number | null>(null);
  const [mandados, setMandados] = useState(0);
  const { titulo, ready } = useMeuTitulo(true);

  useEffect(() => {
    void (async () => setCodigo(await meuConvite(me, nickname)))();
  }, [me, nickname]);

  const tribo = tribos.find((t) => t.id === alvo) ?? null;
  const link = codigo ? linkParaTribo(window.location.origin, codigo, alvo ?? undefined) : "";
  const texto = textoParaTribo(
    nickname,
    link,
    tribo?.nome,
    tribo ? faltamParaAPorta(tribo.membros) : undefined,
  );

  return (
    <section className="lote">
      {ready && (
        <div className={"titulo-cartao" + (titulo.embaixadora ? " embaixadora" : "")}>
          {titulo.embaixadora && (
            <p className="titulo-selo">
              <Icon name="star" />
              {selodeEmbaixadora(titulo)}
            </p>
          )}
          <p className="titulo-conta">{fraseDosConvites(titulo.vingaram)}</p>
          <p className="titulo-recado">{convidaMais(titulo.vingaram)}</p>
        </div>
      )}
      <h2 className="settings-subtitle">Chamar suas amigas</h2>
      <p className="small-note">
        Um toque abre o WhatsApp com o convite escrito. Você escolhe para quem mandar, aí volta e
        manda para a próxima. A nommi não vê sua agenda de contatos.
      </p>

      {tribos.length > 0 && (
        <>
          <p className="lote-rotulo">Para onde o convite leva</p>
          <div className="chips">
            <Button
              variant="outline"
              className={"chip " + (alvo === null ? "selected" : "")}
              onClick={() => setAlvo(null)}
            >
              A nommi
            </Button>
            {tribos.map((t) => (
              <Button
                key={t.id}
                variant="outline"
                className={"chip " + (alvo === t.id ? "selected" : "")}
                onClick={() => setAlvo(t.id)}
              >
                {t.nome}
              </Button>
            ))}
          </div>
        </>
      )}

      <blockquote className="lote-previa">{texto}</blockquote>

      <Button
        className="wide"
        disabled={!codigo || mandados >= MAX_CONVITES_POR_VEZ}
        onClick={() => {
          window.open(enderecoDoWhatsApp(texto), "_blank", "noopener");
          setMandados((n) => n + 1);
        }}
      >
        <Icon name="send" />
        {mandados === 0 ? "Abrir o WhatsApp e convidar" : "Convidar mais uma"}
      </Button>

      <p className="lote-conta">{recadoDoLote(mandados)}</p>

      <Button
        variant="ghost"
        className="wide"
        disabled={!link}
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(texto);
            notify("Convite copiado. Cole onde você quiser.");
          } catch {
            notify("Não deu para copiar aqui. Selecione o texto do convite acima.");
          }
        }}
      >
        <Icon name="link" />
        Copiar o convite
      </Button>
    </section>
  );
}
