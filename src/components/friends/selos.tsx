import { useState } from "react";
import { Button } from "@/components/ui/button";
import { CATALOGO_DE_SELOS, figuraDoSelo, recadoDosSelos, useSelos } from "@/lib/selos";
import { Icon } from "./art";
import { Sheet } from "./surfaces";
import { useFriends } from "./store";

/**
 * O que os amigos dizem. Aparece em qualquer perfil; carimbar, só amizade.
 * Quem é dono da página pode tirar um selo — a página é dele.
 */
export function Selos({
  me,
  dono,
  nome,
  souAmiga,
}: {
  me: string;
  dono: string;
  nome: string;
  souAmiga: boolean;
}) {
  const { notify } = useFriends();
  const { selos, ready, dar, tirar } = useSelos(dono);
  const [abrindo, setAbrindo] = useState(false);
  const souDono = me === dono;
  const primeiro = nome.split(" ")[0] ?? nome;

  if (!ready) return null;

  return (
    <section className="selos">
      <div className="section-heading">
        <h2>{souDono ? "O que seus amigos dizem" : `O que dizem de ${primeiro}`}</h2>
        {souAmiga && !souDono && (
          <Button variant="ghost" size="sm" onClick={() => setAbrindo(true)}>
            <Icon name="plus" />
            Carimbar
          </Button>
        )}
      </div>

      {selos.length === 0 ? (
        <p className="small-note">
          {souDono
            ? "Ninguém te carimbou ainda. Seus amigos podem dizer como você é — e isso ajuda a nommi a achar gente com a sua cara."
            : recadoDosSelos(selos, primeiro)}
        </p>
      ) : (
        <>
          <div className="selos-lista">
            {selos.map((s) => (
              <span key={s.selo} className={"selo" + (s.euDei ? " meu" : "")}>
                <b>{figuraDoSelo(s.selo)}</b>
                {s.selo}
                {s.quantos > 1 && <i>{s.quantos}</i>}
                {(s.euDei || souDono) && (
                  <button
                    type="button"
                    aria-label={"Tirar o selo " + s.selo}
                    onClick={async () =>
                      notify((await tirar(me, s.selo)) ? "Selo tirado." : "Não deu para tirar agora.")
                    }
                  >
                    ✕
                  </button>
                )}
              </span>
            ))}
          </div>
          <p className="small-note">{recadoDosSelos(selos, primeiro)}</p>
        </>
      )}

      {abrindo && (
        <Sheet title={`Como ${primeiro} é?`} onClose={() => setAbrindo(false)}>
          <p className="small-note">
            Escolha o que combina com {primeiro}. Ela vê o selo, mas não vê quem deu.
          </p>
          <div className="figurinhas-grade">
            {CATALOGO_DE_SELOS.map((s) => {
              const jaDei = selos.some((x) => x.selo === s.selo && x.euDei);
              return (
                <button
                  type="button"
                  key={s.selo}
                  className={"fig" + (jaDei ? " marcada" : "")}
                  disabled={jaDei}
                  onClick={async () => {
                    const ok = await dar(me, s.selo);
                    notify(ok ? "Carimbado." : "Não deu para carimbar agora.");
                    if (ok) setAbrindo(false);
                  }}
                >
                  <b>{s.fig}</b>
                  {s.selo}
                </button>
              );
            })}
          </div>
        </Sheet>
      )}
    </section>
  );
}
