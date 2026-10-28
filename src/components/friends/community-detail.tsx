import { useState, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { SemFoto, Avatar, Icon } from "./art";
import { momentPhoto } from "@/lib/friends-photos";
import type { Tribo } from "@/lib/tribos";
import { people } from "@/lib/friends-data";
import { coverStyle } from "@/lib/covers";

function communityPhoto(tribo: Tribo) {
  const name = tribo.name.toLowerCase();
  if (/vinho/.test(name)) return momentPhoto.vinho;
  if (/karaokê|música|sair/.test(name)) return momentPhoto.karaoke;
  if (/corrida/.test(name)) return momentPhoto.corrida;
  if (/café|conversa|séries/.test(name)) return momentPhoto.pizza;
  return momentPhoto.trilha;
}

function DemoPost({
  tribo,
  text,
  nickname,
}: {
  tribo: Tribo;
  text?: string | undefined;
  nickname: string;
}) {
  const [liked, setLiked] = useState(false);
  const [comment, setComment] = useState("");
  const [comments, setComments] = useState<string[]>([]);
  const author = people.find((p) => p.id === tribo.ids[0]);
  return (
    <article className="community-post">
      <header>
        <Avatar id={author?.id ?? 3} size={40} />
        <div>
          <h3>{author?.name ?? tribo.host ?? "nommi"}</h3>
          <span>Post da apresentação</span>
        </div>
        <Icon name="teia" />
      </header>
      <p>
        {text ?? "Uma boa companhia transforma qualquer passeio. Quem vem no próximo encontro?"}
      </p>
      <div className="community-post-gallery">
        <img src={communityPhoto(tribo)} alt="Encontro ilustrativo da tribo" />
        <img src={momentPhoto.trilha} alt="Paisagem de uma trilha" />
        <img src={momentPhoto.pizza} alt="Mesa para compartilhar" />
      </div>
      <div className="community-post-reactions">
        <Button
          variant="ghost"
          aria-label="Curtir publicação"
          aria-pressed={liked}
          onClick={() => setLiked((v) => !v)}
          className={liked ? "is-liked" : ""}
        >
          <Icon name="heart" />
          {liked ? 1 : 0}
        </Button>
        <span>
          <Icon name="chat" />
          {comments.length}
        </span>
      </div>
      {comments.map((c, i) => (
        <div className="community-comment" key={i}>
          <SemFoto size={28} />
          <p>
            <b>{nickname || "Você"}</b>
            <br />
            {c}
          </p>
        </div>
      ))}
      <form
        className="community-comment-form"
        onSubmit={(e) => {
          e.preventDefault();
          if (!comment.trim()) return;
          setComments((v) => [...v, comment.trim()]);
          setComment("");
        }}
      >
        <SemFoto size={28} />
        <input
          className="input"
          aria-label="Comentário na publicação"
          placeholder="Escreva um comentário…"
          maxLength={1000}
          value={comment}
          onChange={(e) => setComment(e.target.value)}
        />
        <Button size="icon" aria-label="Enviar comentário" disabled={!comment.trim()}>
          <Icon name="send" />
        </Button>
      </form>
    </article>
  );
}

export function CommunityDetail({
  tribo,
  member,
  demoMode,
  nickname,
  members,
  onJoin,
  joining,
  conversation,
  events,
  firstMessage,
  posts,
  coverPath,
  coverEditor,
  pedidos,
  secrets,
}: {
  tribo: Tribo;
  member: boolean;
  demoMode: boolean;
  nickname: string;
  members: { user_id: string; nickname: string }[];
  onJoin: () => void;
  joining: boolean;
  conversation: ReactNode;
  events: ReactNode;
  firstMessage?: string | undefined;
  posts?: ReactNode;
  coverPath?: string;
  coverEditor?: ReactNode;
  pedidos?: ReactNode;
  secrets?: ReactNode;
}) {
  const [tab, setTab] = useState("Posts");
  const memberCount = demoMode ? tribo.members : members.length;
  return (
    <div className="community-detail">
      <div className="community-cover" style={coverPath ? coverStyle(coverPath) : undefined}>
        {!coverPath && <img src={communityPhoto(tribo)} alt="Capa ilustrativa da tribo" />}
        {!coverPath && (
          <span className="community-cover-caption">
            {demoMode ? "Apresentação" : "Imagem ilustrativa"}
          </span>
        )}
        {coverEditor && <span className="community-cover-edit">{coverEditor}</span>}
      </div>
      {pedidos}
      <section className="community-summary">
        <span className="community-avatar">
          <Icon name={tribo.icon} />
        </span>
        <div className="community-title-row">
          <div>
            <h1>
              {tribo.name}
              {tribo.official && (
                <span className="tribo-oficial">
                  <Icon name="check" />
                  da nommi
                </span>
              )}
            </h1>
            <p>
              {memberCount} {memberCount === 1 ? "participante" : "participantes"}
              <span>·</span>
              {tribo.mode}
            </p>
          </div>
          <Button onClick={member ? () => setTab("Posts") : onJoin} disabled={joining}>
            <Icon name={member ? "check" : "plus"} />
            {joining ? "Entrando…" : member ? "Na tribo" : "Entrar"}
          </Button>
        </div>
        {tribo.about && <p className="community-description">{tribo.about}</p>}
        <p className="community-description">
          {tribo.rule ||
            "Um assunto em comum, boas conversas e novos encontros. Aqui tem espaço para chegar do seu jeito."}
        </p>
        {(tribo.place || tribo.time) && (
          <div className="community-location">
            {tribo.place && (
              <span>
                <Icon name="pin" />
                {tribo.place}
              </span>
            )}
            {tribo.time && (
              <span>
                <Icon name="clock" />
                {tribo.time}
              </span>
            )}
          </div>
        )}
      </section>
      <div role="tablist" aria-label="Conteúdo da tribo" className="community-tabs">
        {(secrets
          ? ["Membros", "Posts", "Só entre nós", "Eventos"]
          : ["Membros", "Posts", "Eventos"]
        ).map((t) => (
          <Button
            key={t}
            variant="ghost"
            role="tab"
            id={"community-tab-" + t}
            aria-controls={"community-panel-" + t}
            aria-selected={tab === t}
            onClick={() => setTab(t)}
          >
            {t}
          </Button>
        ))}
      </div>
      <section
        role="tabpanel"
        id={"community-panel-" + tab}
        aria-labelledby={"community-tab-" + tab}
        className="community-panel"
        key={tab}
      >
        {tab === "Posts" && (
          <>
            {demoMode ? (
              <DemoPost tribo={tribo} text={firstMessage} nickname={nickname} />
            ) : (
              (posts ?? (
                <div className="community-quiet">
                  <Icon name="image" />
                  <h2>Ainda não há posts nesta tribo.</h2>
                </div>
              ))
            )}
            {conversation}
          </>
        )}
        {tab === "Membros" && (
          <>
            <div className="community-section-heading">
              <h2>Quem faz parte</h2>
              <span>
                {memberCount} {memberCount === 1 ? "participante" : "participantes"}
              </span>
            </div>
            <div className="community-members">
              {demoMode
                ? tribo.ids.map((id) => {
                    const p = people.find((p) => p.id === id);
                    return (
                      <div className="community-member" key={id}>
                        <Avatar id={id} size={48} />
                        <div>
                          <h3>{p?.name ?? "nommi"}</h3>
                          <p>{p?.city ?? tribo.mode}</p>
                        </div>
                      </div>
                    );
                  })
                : members.map((m) => (
                    <Link
                      className="community-member"
                      key={m.user_id}
                      to="/nommi/$id"
                      params={{ id: m.user_id }}
                      aria-label={"Ver o perfil de " + (m.nickname || "um nommi")}
                    >
                      <span className="community-member-icon">
                        <Icon name="users" />
                      </span>
                      <h3>{m.nickname || "nommi"}</h3>
                      <Icon name="arrow" />
                    </Link>
                  ))}
            </div>
            {!member && !demoMode && (
              <p className="small-note">Entre na tribo para conhecer os participantes.</p>
            )}
          </>
        )}
        {tab === "Só entre nós" && secrets}
        {tab === "Eventos" && events}
      </section>
    </div>
  );
}
