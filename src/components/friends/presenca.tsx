import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Avatar, Icon } from "./art";
import { useFriends } from "./store";
import { usePresencas, janelaAberta, fraseDaPresenca, recadoDaConfirmacao } from "@/lib/presenca";

function Face({ avatar, size = 38 }: { avatar: string; size?: number }) {
  return avatar ? (
    <img className="story-face" src={avatar} alt="" width={size} height={size} />
  ) : (
    <Avatar id={3} size={size} />
  );
}

/** Depois do rolê: quem esteve lá diz que esteve, e alguém confirma. Aí vem a estrela. */
export function PresencaDoRole({
  me,
  roleId,
  startsAt,
  souOrganizadora,
  euVou,
}: {
  me: string;
  roleId: number;
  startsAt: string | null;
  souOrganizadora: boolean;
  euVou: boolean;
}) {
  const { notify } = useFriends();
  const {
    presencas,
    ready,
    minhaPresenca,
    estiveLa,
    confirmar,
    souOrganizadora: marcarAnfitria,
  } = usePresencas(me, roleId);
  const [busy, setBusy] = useState(false);
  const aberta = janelaAberta(startsAt);

  if (!aberta) return null;

  const pendentes = presencas.filter((p) => !p.confirmada && !p.souEu);
  const podeConfirmar = souOrganizadora || (minhaPresenca?.confirmada ?? false);

  return (
    <section className="presenca">
      <div className="presenca-topo">
        <span className="presenca-estrela">
          <Icon name="spark" />
        </span>
        <div>
          <b>E aí, como foi?</b>
          <p>
            Quem esteve lá confirma a presença de quem também foi. Cada presença confirmada vale uma
            estrela.
          </p>
        </div>
      </div>

      {!minhaPresenca && euVou && (
        <Button
          className="wide"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            const ok = souOrganizadora ? await marcarAnfitria() : await estiveLa();
            setBusy(false);
            notify(
              ok ? "Pronto. Agora alguém que estava lá confirma." : "Não deu para registrar agora.",
            );
          }}
        >
          <Icon name="check" />
          Estive lá
        </Button>
      )}

      {minhaPresenca && (
        <p className={"presenca-minha" + (minhaPresenca.premiada ? " premiada" : "")}>
          <Icon name={minhaPresenca.confirmada ? "check" : "clock"} />
          {fraseDaPresenca(minhaPresenca)}
        </p>
      )}

      {!ready ? (
        <p className="small-note">Carregando presenças…</p>
      ) : presencas.length === 0 ? (
        <p className="small-note">Ninguém confirmou presença ainda. Comece você.</p>
      ) : (
        <div className="presenca-lista">
          {presencas.map((p) => (
            <article className="presenca-pessoa" key={p.userId}>
              <Face avatar={p.avatar} />
              <div>
                <b>{p.souEu ? "Você" : p.nickname}</b>
                <small>{fraseDaPresenca(p)}</small>
              </div>
              {!p.confirmada && !p.souEu && podeConfirmar && (
                <Button
                  size="sm"
                  disabled={busy}
                  onClick={async () => {
                    setBusy(true);
                    const r = await confirmar(p.userId);
                    setBusy(false);
                    notify(recadoDaConfirmacao(r, p.nickname));
                  }}
                >
                  <Icon name="check" />
                  Confirmar
                </Button>
              )}
              {p.premiada && (
                <span className="presenca-marca">
                  <Icon name="spark" />
                </span>
              )}
            </article>
          ))}
        </div>
      )}

      {pendentes.length > 0 && !podeConfirmar && (
        <p className="small-note">
          Assim que alguém confirmar a sua presença, você também pode confirmar a dos outros.
        </p>
      )}
      <p className="small-note">
        No máximo três rolês premiados por semana. A estrela não se compra: só se ganha indo.
      </p>
    </section>
  );
}

/** Quantas estrelas eu tenho, para mostrar no perfil e no Clube. */
export function MinhasEstrelas({
  saldo,
  ganhasSemana,
  presencas,
}: {
  saldo: number;
  ganhasSemana: number;
  presencas: number;
}) {
  return (
    <div className="estrelas-painel">
      <div>
        <b>{saldo}</b>
        <span>{saldo === 1 ? "estrela" : "estrelas"}</span>
      </div>
      <div>
        <b>{ganhasSemana}</b>
        <span>nesta semana</span>
      </div>
      <div>
        <b>{presencas}</b>
        <span>{presencas === 1 ? "encontro" : "encontros"}</span>
      </div>
    </div>
  );
}
