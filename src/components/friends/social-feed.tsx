import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { SemFoto, Avatar, Icon, Sticker, StickerPicker } from "./art";
import { Sheet, EmptyState } from "./surfaces";
import { useFriends } from "./store";
import {
  usePosts,
  useComments,
  REACTIONS,
  totalReactions,
  timeAgo,
  mediaProblem,
  mediaKind,
  MAX_BODY,
  MAX_COMMENT,
  MAX_MEDIA,
  type Post,
  type FeedScope,
  type CreateResult,
} from "@/lib/posts";
import { useProfileStats, formatCount, useFollow } from "@/lib/follows";
import { useWall, MAX_WALL } from "@/lib/wall";
import { useRoles, whenLabel, spotsLabel, goingBlocker, loadGoing, type Role } from "@/lib/roles";
import { useBlocks, reportTarget, REPORT_REASONS, type ReportReason } from "@/lib/safety";
import { enderecoDaImagem } from "@/lib/covers";

function Face({ url, name, size = 40 }: { url: string; name: string; size?: number }) {
  return url ? (
    <img
      className="real-face"
      src={enderecoDaImagem(url)}
      width={size}
      height={size}
      style={{ width: size, height: size, borderRadius: "50%", objectFit: "cover" }}
      alt={"Foto de " + name}
    />
  ) : (
    <SemFoto size={size} />
  );
}

/** Menu de segurança: bloquear e denunciar, com confirmação e aviso. */
export function SafetyMenu({
  me,
  targetUserId,
  targetUserName,
  targetTeiaId,
}: {
  me: string;
  targetUserId?: string;
  targetUserName?: string;
  targetTeiaId?: number;
}) {
  const { notify } = useFriends();
  const { blockedIds, block } = useBlocks(me);
  const [open, setOpen] = useState(false);
  const [confirmBlock, setConfirmBlock] = useState(false);
  const [reporting, setReporting] = useState(false);
  const [reason, setReason] = useState<ReportReason>("assedio");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  if (targetUserId === me) return null;
  const alreadyBlocked = targetUserId ? blockedIds.includes(targetUserId) : false;
  const close = () => {
    setOpen(false);
    setConfirmBlock(false);
    setReporting(false);
    setNote("");
  };
  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        aria-label="Opções de segurança"
        onClick={() => setOpen(true)}
      >
        <Icon name="more" />
      </Button>
      {open && (
        <Sheet title="Opções" onClose={close}>
          {!reporting && (
            <>
              {targetUserId && (
                <Button
                  variant="ghost"
                  className="sheet-option"
                  onClick={() => setConfirmBlock(true)}
                >
                  <Icon name="block" />
                  {alreadyBlocked ? "Pessoa bloqueada" : "Bloquear"}
                </Button>
              )}
              <Button variant="ghost" className="sheet-option" onClick={() => setReporting(true)}>
                <Icon name="flag" />
                Denunciar
              </Button>
              {confirmBlock && targetUserId && (
                <div className="block-confirm">
                  <p>
                    {alreadyBlocked
                      ? "Você já bloqueou esta pessoa."
                      : "Bloquear " +
                        (targetUserName ?? "esta pessoa") +
                        "? Nenhum dos dois verá o outro no Nommi."}
                  </p>
                  {!alreadyBlocked && (
                    <Button
                      className="wide"
                      disabled={busy}
                      onClick={async () => {
                        setBusy(true);
                        const ok = await block(targetUserId);
                        setBusy(false);
                        notify(
                          ok
                            ? "Pessoa bloqueada. Nenhum dos dois verá o outro."
                            : "Não foi possível bloquear agora.",
                        );
                        if (ok) close();
                      }}
                    >
                      Confirmar bloqueio
                    </Button>
                  )}
                  <Button
                    variant="secondary"
                    className="wide"
                    onClick={() => setConfirmBlock(false)}
                  >
                    Cancelar
                  </Button>
                </div>
              )}
            </>
          )}
          {reporting && (
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                setBusy(true);
                const ok = await reportTarget(
                  me,
                  targetUserId ? { userId: targetUserId } : { teiaId: targetTeiaId },
                  reason,
                  note,
                );
                setBusy(false);
                notify(
                  ok
                    ? "Denúncia registrada. Obrigado por cuidar da tribo."
                    : "Não foi possível registrar a denúncia.",
                );
                if (ok) close();
              }}
            >
              <label>
                Motivo
                <select
                  className="input"
                  value={reason}
                  onChange={(e) => setReason(e.target.value as ReportReason)}
                >
                  {REPORT_REASONS.map((r) => (
                    <option key={r.value} value={r.value}>
                      {r.label}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Observação <small>opcional</small>
                <textarea
                  className="input"
                  rows={3}
                  maxLength={500}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Conte em poucas palavras o que aconteceu"
                />
              </label>
              <p className="small-note">{note.length}/500</p>
              <Button className="wide" disabled={busy}>
                <Icon name="flag" />
                {busy ? "Enviando…" : "Enviar denúncia"}
              </Button>
              <Button
                type="button"
                variant="secondary"
                className="wide"
                onClick={() => setReporting(false)}
              >
                Voltar
              </Button>
            </form>
          )}
        </Sheet>
      )}
    </>
  );
}

function CommentsSheet({
  me,
  post,
  nickname,
  onClose,
}: {
  me: string;
  post: Post;
  nickname: string;
  onClose: () => void;
}) {
  const { items, add, remove } = useComments(me, post.id);
  const [text, setText] = useState("");
  return (
    <Sheet title={"Comentários · " + post.authorName.split(" ")[0]} onClose={onClose}>
      <div className="message-list">
        {items.map((c) => (
          <div className={"message-row " + (c.mine ? "mine" : "")} key={c.id}>
            {!c.mine && <SemFoto size={28} />}
            <div className="message-content">
              <small>{c.author}</small>
              <p className="bubble">{c.body}</p>
              <time className="message-time">{timeAgo(c.createdAt)}</time>
              {c.mine && (
                <Button variant="ghost" size="sm" onClick={() => void remove(c.id)}>
                  Apagar
                </Button>
              )}
            </div>
          </div>
        ))}
        {!items.length && <p className="small-note">Seja a primeira pessoa a comentar.</p>}
      </div>
      <form
        className="composer"
        onSubmit={async (e) => {
          e.preventDefault();
          if (await add(text, nickname)) setText("");
        }}
      >
        <input
          className="input"
          aria-label="Seu comentário"
          placeholder="Escreva um comentário…"
          maxLength={MAX_COMMENT}
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <Button size="icon" aria-label="Enviar comentário" disabled={!text.trim()}>
          <Icon name="send" />
        </Button>
      </form>
      <p className="small-note">
        {text.length}/{MAX_COMMENT}
      </p>
    </Sheet>
  );
}

export function PostCard({
  me,
  post,
  nickname,
  onReact,
  onRemove,
}: {
  me: string;
  post: Post;
  nickname: string;
  onReact: (p: Post, kind: Post["myReaction"] & string) => void;
  onRemove: (id: string) => void;
}) {
  const { notify } = useFriends();
  const [comments, setComments] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  return (
    <article className="community-post">
      <header>
        <Link to="/nommi/$id" params={{ id: post.authorId }}>
          <Face url={post.authorAvatar} name={post.authorName} />
        </Link>
        <div>
          <h3>{post.authorName}</h3>
          <span>
            {timeAgo(post.createdAt)}
            {post.location ? " · " + post.location : ""}
          </span>
        </div>
        {post.mine ? (
          <Button
            variant="ghost"
            size="icon"
            aria-label="Opções do post"
            onClick={() => setConfirmDelete(true)}
          >
            <Icon name="more" />
          </Button>
        ) : (
          <SafetyMenu me={me} targetUserId={post.authorId} targetUserName={post.authorName} />
        )}
      </header>
      <p>{post.body}</p>
      {post.media.length > 0 && (
        <div className="community-post-gallery">
          {post.media
            .slice(0, MAX_MEDIA)
            .map((m) =>
              m.kind === "video" ? (
                <video key={m.id} src={m.url} controls preload="metadata" />
              ) : (
                <img key={m.id} src={m.url} alt="Foto do post" />
              ),
            )}
        </div>
      )}
      <div className="community-post-reactions">
        {REACTIONS.map((r) => (
          <Button
            key={r.kind}
            variant="ghost"
            aria-label={r.label}
            aria-pressed={post.myReaction === r.kind}
            className={post.myReaction === r.kind ? "is-liked" : ""}
            onClick={() => onReact(post, r.kind)}
          >
            <Icon
              name={r.kind === "curtir" ? "heart" : r.kind === "apoiar" ? "spark" : "stickers"}
            />
            {post.reactions[r.kind] || ""}
          </Button>
        ))}
        <span>
          <Icon name="heart" />
          {totalReactions(post)}
        </span>
        <Button
          variant="ghost"
          aria-label="Comentários"
          aria-expanded={comments}
          onClick={() => setComments(true)}
        >
          <Icon name="chat" />
          {post.commentCount}
        </Button>
      </div>
      {comments && (
        <CommentsSheet me={me} post={post} nickname={nickname} onClose={() => setComments(false)} />
      )}
      {confirmDelete && (
        <Sheet title="Apagar este post?" onClose={() => setConfirmDelete(false)}>
          <p>O post sai do ar para todo mundo. Essa ação não pode ser desfeita.</p>
          <Button
            className="wide"
            onClick={() => {
              onRemove(post.id);
              setConfirmDelete(false);
              notify("Post apagado.");
            }}
          >
            Apagar post
          </Button>
          <Button variant="secondary" className="wide" onClick={() => setConfirmDelete(false)}>
            Manter post
          </Button>
        </Sheet>
      )}
    </article>
  );
}

export function Feed({
  me,
  nickname,
  scope = {},
  emptyTitle = "Ainda não há posts por aqui.",
  emptyText = "Quando alguém do seu círculo publicar, aparece nesta lista.",
}: {
  me: string;
  nickname: string;
  scope?: FeedScope;
  emptyTitle?: string;
  emptyText?: string;
}) {
  const { posts, ready, react, remove } = usePosts(me, scope);
  if (!ready) return <p className="small-note">Carregando posts…</p>;
  if (!posts.length) return <EmptyState title={emptyTitle} text={emptyText} />;
  return (
    <div className="feed-list">
      {posts.map((p) => (
        <PostCard
          key={p.id}
          me={me}
          post={p}
          nickname={nickname}
          onReact={(post, kind) => void react(post, kind as never)}
          onRemove={(id) => void remove(id)}
        />
      ))}
    </div>
  );
}

export function CreatePostForm({
  me,
  nickname,
  tribos,
  onDone,
}: {
  me: string;
  nickname: string;
  tribos: { id: number; name: string }[];
  onDone?: () => void;
}) {
  const { notify } = useFriends();
  const { publish } = usePosts(me);
  const [text, setText] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [location, setLocation] = useState("");
  const [teiaId, setTeiaId] = useState<number | "">("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  function pick(list: FileList | null) {
    if (!list) return;
    const next = [...files];
    for (const f of Array.from(list)) {
      const problem = mediaProblem(f, next.length);
      if (problem) {
        setError(problem);
        continue;
      }
      next.push(f);
    }
    setFiles(next.slice(0, MAX_MEDIA));
  }
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const r: CreateResult = await publish({
      body: text,
      files,
      location,
      teiaId: teiaId === "" ? null : teiaId,
    });
    setBusy(false);
    if (!r.ok) {
      setError(r.error);
      return;
    }
    notify("Post publicado!");
    setText("");
    setFiles([]);
    setLocation("");
    setTeiaId("");
    onDone?.();
  }
  return (
    <form className="invite-form" onSubmit={(e) => void submit(e)}>
      <label>
        Seu post
        <textarea
          className="input"
          rows={4}
          maxLength={MAX_BODY}
          required
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="O que está acontecendo?"
        />
      </label>
      <p className="small-note">
        {text.length}/{MAX_BODY}
      </p>
      <label className="photo-label">
        Adicionar fotos ou vídeos ({files.length}/{MAX_MEDIA})
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp,video/mp4,video/webm"
          multiple
          aria-label="Adicionar fotos ou vídeos"
          onChange={(e) => {
            pick(e.target.files);
            e.target.value = "";
          }}
        />
      </label>
      {files.length > 0 && (
        <ul className="checkin-list">
          {files.map((f, i) => (
            <li key={i}>
              <Icon name={mediaKind(f.type) === "video" ? "image" : "image"} />
              {f.name}
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setFiles(files.filter((_, j) => j !== i))}
              >
                Tirar
              </Button>
            </li>
          ))}
        </ul>
      )}
      <label>
        Local <small>opcional</small>
        <input
          className="input"
          maxLength={80}
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          placeholder="Ex.: Parque Municipal"
        />
      </label>
      {tribos.length > 0 && (
        <label>
          Postar numa tribo <small>opcional</small>
          <select
            className="input"
            value={teiaId}
            onChange={(e) => setTeiaId(e.target.value === "" ? "" : Number(e.target.value))}
          >
            <option value="">Só no meu perfil</option>
            {tribos.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </label>
      )}
      {error && (
        <p role="alert" className="form-error">
          {error}
        </p>
      )}
      <Button className="wide" disabled={busy || !text.trim()}>
        <Icon name="send" />
        {busy ? "Publicando…" : "Publicar"}
      </Button>
    </form>
  );
}

export function RoleCard({
  me,
  role,
  nickname,
  onToggle,
}: {
  me: string;
  role: Role;
  nickname: string;
  onToggle: (r: Role) => Promise<boolean>;
}) {
  const { notify } = useFriends();
  const isHost = role.host === nickname;
  const blocker = goingBlocker(role, isHost);
  const [going, setGoing] = useState<{ id: string; nickname: string; avatar_url: string }[] | null>(
    null,
  );
  useEffect(() => {
    if (isHost) void loadGoing(role.id).then(setGoing);
  }, [isHost, role.id, role.going]);
  return (
    <article className="group-card">
      <div className="row">
        <span className="tone-icon yellow">
          <Icon name="pin" />
        </span>
        <div>
          <h3>{role.name}</h3>
          <p>{[role.category, role.city, role.place].filter(Boolean).join(" · ")}</p>
        </div>
      </div>
      <p className="invite-when">
        <Icon name="clock" />
        {whenLabel(role)}
      </p>
      <p className="invite-where">
        <Icon name="users" />
        {spotsLabel(role)}
        {role.host ? " · " + role.host + " organiza" : ""}
      </p>
      {isHost && going && (
        <div className="community-members">
          {going.length ? (
            going.map((p) => (
              <div className="community-member" key={p.id}>
                <Face url={p.avatar_url} name={p.nickname} size={36} />
                <h3>{p.nickname || "nommi"}</h3>
              </div>
            ))
          ) : (
            <p className="small-note">Ainda ninguém confirmou.</p>
          )}
        </div>
      )}
      <div className="group-card-bottom">
        {blocker ? (
          <>
            <Button variant="secondary" className="wide" disabled>
              <Icon name="teia" />
              Quero ir
            </Button>
            <p className="small-note">{blocker}</p>
          </>
        ) : (
          <Button
            variant={role.iAmGoing ? "secondary" : "default"}
            className="wide"
            onClick={async () => {
              const ok = await onToggle(role);
              if (!ok) notify("Não foi possível confirmar agora.");
            }}
          >
            <Icon name={role.iAmGoing ? "check" : "teia"} />
            {role.iAmGoing ? "Você vai" : "Quero ir"}
          </Button>
        )}
        <Button asChild variant="ghost">
          <Link to="/grupos/$id" params={{ id: String(role.id) }}>
            Abrir
            <Icon name="arrow" />
          </Link>
        </Button>
      </div>
    </article>
  );
}

export function RolesList({
  me,
  nickname,
  filter,
}: {
  me: string;
  nickname: string;
  filter?: (r: Role) => boolean;
}) {
  const { roles, ready, toggleGoing } = useRoles(me);
  const list = filter ? roles.filter(filter) : roles;
  if (!ready) return <p className="small-note">Carregando rolês…</p>;
  if (!list.length)
    return (
      <EmptyState title="Nenhum rolê por aqui ainda." text="Proponha um plano e veja quem topa." />
    );
  return (
    <div className="group-grid">
      {list.map((r) => (
        <RoleCard
          key={r.id}
          me={me}
          role={r}
          nickname={nickname}
          onToggle={async (role) => {
            const ok = await toggleGoing(role);
            return ok;
          }}
        />
      ))}
    </div>
  );
}

export function StatsLine({ userId }: { userId: string }) {
  const { stats } = useProfileStats(userId);
  if (!stats || !stats.visible) return null;
  return (
    <div className="stats">
      <div>
        <b>{formatCount(stats.followers)}</b>
        <span>seguidores</span>
      </div>
      <div>
        <b>{formatCount(stats.following)}</b>
        <span>seguindo</span>
      </div>
      <div>
        <b>{formatCount(stats.connections)}</b>
        <span>amigos</span>
      </div>
      <div>
        <b>{formatCount(stats.tribos)}</b>
        <span>tribos</span>
      </div>
      <div>
        <b>{formatCount(stats.posts)}</b>
        <span>posts</span>
      </div>
    </div>
  );
}

export function FollowButton({ me, target }: { me: string; target: string }) {
  const { notify } = useFriends();
  const { following, ready, toggle } = useFollow(me, target);
  if (me === target || !ready) return null;
  return (
    <Button
      variant={following ? "secondary" : "default"}
      onClick={async () => {
        const ok = await toggle();
        notify(
          ok
            ? following
              ? "Você deixou de seguir."
              : "Você começou a seguir."
            : "Não foi possível agora.",
        );
      }}
    >
      <Icon name={following ? "check" : "plus"} />
      {following ? "Seguindo" : "Seguir"}
    </Button>
  );
}

export function WallPanel({
  me,
  ownerId,
  nickname,
  canWrite,
}: {
  me: string;
  ownerId: string;
  nickname: string;
  canWrite: boolean;
}) {
  const { notify } = useFriends();
  const { approved, pending, mineWaiting, write, approve, remove } = useWall(me, ownerId);
  const [text, setText] = useState("");
  const isOwner = me === ownerId;
  return (
    <section>
      <h2>Meus amigos dizem</h2>
      {!approved.length && (
        <p className="small-note">
          O mural ainda está vazio. Frases e figurinhas das amizades aparecem aqui depois da
          aprovação.
        </p>
      )}
      <div className="sticker-wall">
        {approved
          .filter((w) => w.sticker != null)
          .map((w) => (
            <Sticker key={w.id} id={w.sticker!} author={w.author} />
          ))}
      </div>
      {approved
        .filter((w) => w.body)
        .map((w) => (
          <blockquote key={w.id}>
            “{w.body}”<small>{w.author}</small>
          </blockquote>
        ))}
      {mineWaiting.length > 0 && (
        <p className="small-note">Sua contribuição espera a aprovação de quem tem o perfil.</p>
      )}
      {canWrite && !isOwner && (
        <>
          <h3>Deixe uma frase ou figurinha</h3>
          <form
            className="composer"
            onSubmit={async (e) => {
              e.preventDefault();
              const ok = await write({ text }, nickname);
              if (ok) {
                setText("");
                notify("Enviado para aprovação.");
              } else notify("Escreva de 1 a " + MAX_WALL + " letras.");
            }}
          >
            <input
              className="input"
              aria-label="Frase para o mural"
              maxLength={MAX_WALL}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Uma frase carinhosa…"
            />
            <Button size="icon" aria-label="Enviar frase" disabled={!text.trim()}>
              <Icon name="send" />
            </Button>
          </form>
          <p className="small-note">
            {text.length}/{MAX_WALL}
          </p>
          <StickerPicker
            onPick={(id) =>
              void write({ sticker: id }, nickname).then((ok) =>
                notify(ok ? "Figurinha enviada para aprovação." : "Não foi possível enviar."),
              )
            }
          />
        </>
      )}
      {isOwner && pending.length > 0 && (
        <section className="approval">
          <h3>Aguardando sua aprovação</h3>
          {pending.map((w) => (
            <div className="row" key={w.id}>
              {w.sticker != null ? (
                <Sticker id={w.sticker} size={52} author={w.author} />
              ) : (
                <p>
                  “{w.body}” — {w.author}
                </p>
              )}
              <Button
                variant="secondary"
                onClick={() =>
                  void approve(w.id).then((ok) =>
                    notify(ok ? "Aprovado e colado no mural." : "Não foi possível aprovar."),
                  )
                }
              >
                <Icon name="check" />
                Aprovar
              </Button>
              <Button
                variant="ghost"
                onClick={() => void remove(w.id).then(() => notify("Contribuição apagada."))}
              >
                Apagar
              </Button>
            </div>
          ))}
        </section>
      )}
    </section>
  );
}
