import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { SemFoto, Avatar, Icon } from "./art";
import { ChatSticker, ChatStickerTray } from "./chat-stickers";
import { Esqueleto, EmptyState } from "./surfaces";
import {
  useConversas,
  useConversa,
  previewOf,
  hourOf,
  dayLabel,
  MAX_MESSAGE,
  type DirectMessage,
} from "@/lib/direct-messages";

function Face({ avatar, size = 48 }: { avatar: string; size?: number }) {
  return avatar ? (
    <img className="story-face" src={avatar} alt="" width={size} height={size} />
  ) : (
    <SemFoto size={size} />
  );
}

/** Lista das conversas a sós: uma por amizade, com a última mensagem e o que falta ler. */
export function DirectConversations({ me }: { me: string }) {
  const { conversas, ready } = useConversas(me);
  if (!ready) return <Esqueleto tipo="conversa" />;
  if (!conversas.length)
    return (
      <EmptyState
        title="Você ainda não tem com quem conversar aqui."
        text="A conversa a sós abre quando vocês viram amizade. Procure pessoas e envie um pedido."
      >
        <Button asChild>
          <Link to="/descobrir">
            <Icon name="spark" />
            Encontrar pessoas
          </Link>
        </Button>
      </EmptyState>
    );
  return (
    <div className="conversation-list">
      {conversas.map((c) => (
        <Link
          key={c.outroId}
          to="/conversas/$id"
          params={{ id: c.outroId }}
          className={"conversation" + (c.naoLidas ? " unread" : "")}
        >
          <Face avatar={c.avatar} />
          <div>
            <h3>{c.nickname}</h3>
            <p>{previewOf(c)}</p>
          </div>
          {c.naoLidas > 0 ? (
            <span className="unread-badge">{c.naoLidas}</span>
          ) : (
            <Icon name="arrow" />
          )}
        </Link>
      ))}
    </div>
  );
}

/** A conversa com uma pessoa, ao vivo. */
export function DirectChat({
  me,
  outroId,
  nickname,
  avatar,
}: {
  me: string;
  outroId: string;
  nickname: string;
  avatar: string;
}) {
  const { messages, ready, send } = useConversa(me, outroId);
  const [text, setText] = useState("");
  const [tray, setTray] = useState(false);
  const [busy, setBusy] = useState(false);
  const [erro, setErro] = useState("");
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => {
    end.current?.scrollIntoView({ block: "nearest" });
  }, [messages.length]);

  async function enviar(input: { text?: string; sticker?: number }) {
    setBusy(true);
    const ok = await send(input);
    setBusy(false);
    if (ok) {
      setText("");
      setErro("");
    } else setErro("Não foi possível enviar. Vocês ainda são amizade?");
  }

  let ultimoDia = "";
  return (
    <section className="chat-panel direct-chat">
      <div className="chat-heading">
        <Button asChild variant="ghost" size="icon">
          <Link to="/conversas" aria-label="Voltar para conversas">
            <Icon name="back" />
          </Link>
        </Button>
        <Link to="/nommi/$id" params={{ id: outroId }} className="chat-person">
          <Face avatar={avatar} size={40} />
          <div>
            <h2>{nickname}</h2>
            <small>Ver perfil</small>
          </div>
        </Link>
      </div>

      {!ready ? (
        <Esqueleto tipo="conversa" />
      ) : (
        <div className="message-list">
          {messages.length === 0 && (
            <p className="small-note chat-first">
              Vocês ainda não conversaram. Que tal combinar um café?
            </p>
          )}
          {messages.map((m: DirectMessage) => {
            const dia = dayLabel(m.createdAt);
            const marcador = dia !== ultimoDia ? ((ultimoDia = dia), dia) : null;
            return (
              <div key={m.id}>
                {marcador && <p className="chat-day">{marcador}</p>}
                <div
                  className={
                    "message-row " + (m.mine ? "mine" : "") + (m.body ? "" : " sticker-message-row")
                  }
                >
                  {!m.mine && <Face avatar={avatar} size={28} />}
                  <div className="message-content">
                    {m.body ? (
                      <p className="bubble">{m.body}</p>
                    ) : (
                      <ChatSticker id={m.sticker ?? 0} />
                    )}
                    <time className="message-time">
                      {hourOf(m.createdAt)}
                      {m.mine && m.readAt ? " · lida" : ""}
                    </time>
                  </div>
                </div>
              </div>
            );
          })}
          <div ref={end} />
        </div>
      )}

      {erro && (
        <p role="alert" className="form-error">
          {erro}
        </p>
      )}
      <form
        className="composer"
        onSubmit={(e) => {
          e.preventDefault();
          if (text.trim()) void enviar({ text });
        }}
      >
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="Abrir figurinhas"
          onClick={() => setTray((v) => !v)}
        >
          <Icon name="stickers" />
        </Button>
        <input
          className="input"
          aria-label="Sua mensagem"
          maxLength={MAX_MESSAGE}
          value={text}
          placeholder="Escreva uma mensagem"
          onChange={(e) => setText(e.target.value)}
        />
        <Button size="icon" aria-label="Enviar mensagem" disabled={!text.trim() || busy}>
          <Icon name="send" />
        </Button>
      </form>
      {tray && (
        <ChatStickerTray
          onSend={(id) => {
            void enviar({ sticker: id });
            setTray(false);
          }}
          onClose={() => setTray(false)}
        />
      )}
      <p className="small-note">
        Combine encontros em lugares públicos e avise alguém de confiança.
      </p>
    </section>
  );
}
