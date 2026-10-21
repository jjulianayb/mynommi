import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Avatar, Icon } from "./art";
import { EmptyState } from "./surfaces";
import { SafetyMenu } from "./social-feed";
import { useSecrets, timeLeft, PRAZOS, MAX_SECRET, DIAS_PADRAO } from "@/lib/secrets";
import { timeAgo } from "@/lib/posts";

function Face({ avatar, size = 36 }: { avatar: string; size?: number }) {
  return avatar ? (
    <img className="story-face" src={avatar} alt="" width={size} height={size} />
  ) : (
    <Avatar id={3} size={size} />
  );
}

/** "Só entre nós": o que se conta aqui não sai da tribo e some sozinho. */
export function TribeSecrets({
  me,
  triboId,
  isMember,
}: {
  me: string;
  triboId: number;
  isMember: boolean;
}) {
  const { secrets, ready, publish, remove } = useSecrets(me, isMember ? triboId : null);
  const [text, setText] = useState("");
  const [dias, setDias] = useState<number>(DIAS_PADRAO);
  const [erro, setErro] = useState("");
  const [busy, setBusy] = useState(false);

  if (!isMember)
    return (
      <EmptyState
        title="Isto é só para quem está na tribo."
        text="Entre na tribo para ler e contar o que fica entre vocês."
      />
    );

  return (
    <section className="tribe-secrets">
      <div className="secrets-rule">
        <Icon name="lock" />
        <div>
          <b>O que se conta aqui fica aqui.</b>
          <p>
            Só quem está nesta tribo lê, e cada recado some sozinho. Fale do que vocês viveram
            juntos, não da vida de quem não está aqui. Nada de print.
          </p>
        </div>
      </div>

      <form
        className="secrets-form"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          const r = await publish(text, dias);
          setBusy(false);
          if (r.ok) {
            setText("");
            setErro("");
          } else setErro(r.error);
        }}
      >
        <textarea
          className="input"
          rows={3}
          maxLength={MAX_SECRET}
          value={text}
          placeholder="Conta aí o que rolou no último encontro…"
          onChange={(e) => setText(e.target.value)}
        />
        <div className="secrets-bottom">
          <div className="chips">
            {PRAZOS.map((p) => (
              <Button
                key={p.dias}
                type="button"
                variant="ghost"
                className={"chip" + (dias === p.dias ? " active" : "")}
                aria-pressed={dias === p.dias}
                onClick={() => setDias(p.dias)}
              >
                {p.label}
              </Button>
            ))}
          </div>
          <span className="small-note">
            {text.length}/{MAX_SECRET}
          </span>
          <Button disabled={!text.trim() || busy}>
            <Icon name="send" />
            {busy ? "Contando…" : "Contar"}
          </Button>
        </div>
      </form>
      {erro && (
        <p role="alert" className="form-error">
          {erro}
        </p>
      )}

      {!ready ? (
        <p className="small-note">Carregando…</p>
      ) : secrets.length === 0 ? (
        <EmptyState
          title="Ainda não contaram nada por aqui."
          text="Comece você: como foi o último encontro de vocês?"
        />
      ) : (
        <div className="secrets-list">
          {secrets.map((s) => (
            <article className="secret-card" key={s.id}>
              <header>
                <Face avatar={s.authorAvatar} />
                <div>
                  <b>{s.mine ? "Você" : s.authorName}</b>
                  <small>
                    {timeAgo(s.createdAt)} · {timeLeft(s.expiresAt)}
                  </small>
                </div>
                {s.mine ? (
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Apagar o que contei"
                    onClick={() => void remove(s.id)}
                  >
                    <Icon name="trash" />
                  </Button>
                ) : (
                  <SafetyMenu me={me} targetUserId={s.authorId} targetUserName={s.authorName} />
                )}
              </header>
              <p>{s.body}</p>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
