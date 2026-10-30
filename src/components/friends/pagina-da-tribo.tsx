import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { enderecoDaImagem } from "@/lib/covers";
import { desenhoDaFigurinha, useTriboPublica } from "@/lib/tribo-da-dona";
import { Brand, Esqueleto } from "./surfaces";
import { Icon } from "./art";

/**
 * A página pública da tribo: o endereço que a dona cola nas redes dela.
 *
 * Abre para quem não tem conta, que é o ponto. Então o que ela mostra é
 * escolhido com cuidado:
 *
 * - **nenhum membro aparece**, nem nome nem foto. Entrar numa tribo não é
 *   aceitar virar vitrine de divulgação.
 * - **quantas pessoas são** é o número real, sempre. Tribo com duas pessoas
 *   diz duas: quem chega por um número inflado descobre na primeira tela.
 * - **tribo sensível não tem página nenhuma** (o banco nem responde), porque
 *   uma página aberta sobre política, religião ou orientação expõe o assunto
 *   de quem está lá.
 */
export function PaginaDaTribo({ id }: { id: string }) {
  const numero = Number(id);
  const { tribo, ready } = useTriboPublica(Number.isFinite(numero) ? numero : null);

  if (!ready)
    return (
      <div className="entry-layout">
        <Brand />
        <Esqueleto tipo="perfil" />
      </div>
    );

  if (!tribo)
    return (
      <div className="entry-layout">
        <Brand />
        <h1>Esta tribo não tem página aberta</h1>
        <p className="muted">
          O link pode ter sido desligado por quem criou a tribo, ou a tribo não existe mais. Se
          alguém te chamou, peça um convite direto.
        </p>
        <Button asChild className="wide">
          <Link to="/conta">Conhecer a nommi</Link>
        </Button>
      </div>
    );

  const capa = enderecoDaImagem(tribo.cover_path ?? "");
  const fig = desenhoDaFigurinha(tribo.figurinha);
  const partes = [
    { titulo: "Do que é", texto: tribo.about },
    { titulo: "Missão", texto: tribo.missao },
    { titulo: "Valores", texto: tribo.valores },
    { titulo: "Visão", texto: tribo.visao },
    { titulo: "As regras daqui", texto: tribo.rule },
  ].filter((x) => (x.texto ?? "").trim() !== "");

  return (
    <article className="tribo-publica">
      {capa && (
        <div
          className="tribo-publica-capa"
          aria-hidden="true"
          style={{
            backgroundImage: `url(${capa})`,
            backgroundPosition: `${tribo.cover_x ?? 50}% ${tribo.cover_y ?? 50}%`,
          }}
        />
      )}
      <header className="tribo-publica-topo">
        <Brand />
        <h1>
          {fig && <span aria-hidden="true">{fig} </span>}
          {tribo.name}
        </h1>
        <p className="muted">
          {tribo.city ? tribo.city + " · " : ""}
          {tribo.quantas === 1 ? "1 pessoa" : `${tribo.quantas} pessoas`}
          {tribo.oficial ? " · tribo da nommi" : ` · criada por ${tribo.dona}`}
        </p>
      </header>

      {partes.map((x) => (
        <section key={x.titulo} className="tribo-publica-parte">
          <h2>{x.titulo}</h2>
          <p>{x.texto}</p>
        </section>
      ))}

      <section className="tribo-publica-entrar">
        <p>
          A nommi é um app de amizade entre mulheres. Para entrar nesta tribo, crie sua conta: leva
          um minuto e é de graça.
        </p>
        <Button asChild className="wide">
          {/* O id da tribo vai no endereço, e o app guarda antes do login:
              assim a pessoa cai dentro desta tribo depois de criar a conta. */}
          <a href={`/conta?modo=criar&tribo=${tribo.id}`}>
            <Icon name="teia" />
            Criar conta e entrar na tribo
          </a>
        </Button>
        <p className="small-note">
          {tribo.entrada === "fechada"
            ? "Esta tribo é fechada: depois de criar a conta, você pede para entrar e quem criou responde."
            : "Depois de criar a conta, você entra direto."}
        </p>
        <Link to="/conta" className="muted">
          Já tenho conta
        </Link>
      </section>
    </article>
  );
}
