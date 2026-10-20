import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Avatar, Icon } from "./art";
import { Sheet } from "./surfaces";
import {
  useStories,
  storyProblem,
  timeLeft,
  MAX_CAPTION,
  type Story,
  type StoryAudience,
  type StoryGroup,
} from "@/lib/stories";

function Face({ name, avatar, size = 56 }: { name: string; avatar: string; size?: number }) {
  if (avatar) return <img className="story-face" src={avatar} alt="" width={size} height={size} />;
  return <Avatar id={3} size={size} />;
}

/** Fita de stories no topo do Início: o seu primeiro, depois quem tem novidade. */
export function StoriesStrip({ me, nickname }: { me: string; nickname: string }) {
  const { groups, ready, publish, markSeen, remove } = useStories(me);
  const [open, setOpen] = useState<StoryGroup | null>(null);
  const [posting, setPosting] = useState(false);
  const mine = groups.find((g) => g.mine);

  if (!ready) return null;
  return (
    <>
      <section className="stories-strip" aria-label="Stories">
        <button type="button" className="story-bubble add" onClick={() => setPosting(true)}>
          <span className="story-ring new">
            <Face name={nickname} avatar={mine?.authorAvatar ?? ""} />
            <span className="story-plus">
              <Icon name="plus" />
            </span>
          </span>
          <small>{mine ? "Seu story" : "Adicionar"}</small>
        </button>
        {groups
          .filter((g) => !g.mine)
          .map((g) => (
            <button
              type="button"
              key={g.authorId}
              className="story-bubble"
              onClick={() => setOpen(g)}
            >
              <span className={"story-ring" + (g.allSeen ? " seen" : "")}>
                <Face name={g.authorName} avatar={g.authorAvatar} />
              </span>
              <small>{g.authorName.split(" ")[0]}</small>
            </button>
          ))}
        {groups.length === 0 && (
          <p className="small-note stories-empty">Ninguém publicou story ainda. Comece você.</p>
        )}
      </section>
      {mine && (
        <button type="button" className="stories-mine-link" onClick={() => setOpen(mine)}>
          Ver o meu story
        </button>
      )}
      {open && (
        <StoryViewer
          group={open}
          onClose={() => setOpen(null)}
          onSeen={markSeen}
          onRemove={async (s) => {
            await remove(s);
            setOpen(null);
          }}
        />
      )}
      {posting && <StoryComposer onClose={() => setPosting(false)} onPublish={publish} />}
    </>
  );
}

/** Tela cheia, um story por vez, com barrinhas em cima. */
function StoryViewer({
  group,
  onClose,
  onSeen,
  onRemove,
}: {
  group: StoryGroup;
  onClose: () => void;
  onSeen: (s: Story) => void;
  onRemove: (s: Story) => void;
}) {
  const [i, setI] = useState(0);
  const story = group.stories[i];
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!story) return;
    onSeen(story);
    if (story.kind === "foto") {
      timer.current = setTimeout(() => {
        if (i + 1 < group.stories.length) setI(i + 1);
        else onClose();
      }, 6000);
      return () => {
        if (timer.current) clearTimeout(timer.current);
      };
    }
    return;
  }, [story?.id, i]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!story) return null;
  const next = () => (i + 1 < group.stories.length ? setI(i + 1) : onClose());
  const prev = () => (i > 0 ? setI(i - 1) : undefined);

  return (
    <div
      className="story-viewer"
      role="dialog"
      aria-modal="true"
      aria-label={"Story de " + group.authorName}
      onKeyDown={(e) => {
        if (e.key === "Escape") onClose();
        if (e.key === "ArrowRight") next();
        if (e.key === "ArrowLeft") prev();
      }}
    >
      <div className="story-bars">
        {group.stories.map((s, n) => (
          <span key={s.id} className={n < i ? "done" : n === i ? "now" : ""} />
        ))}
      </div>
      <header className="story-head">
        <Face name={group.authorName} avatar={group.authorAvatar} size={38} />
        <div>
          <b>{group.mine ? "Você" : group.authorName}</b>
          <small>{timeLeft(story.expiresAt)}</small>
        </div>
        {group.mine && (
          <Button
            variant="ghost"
            size="icon"
            aria-label="Apagar este story"
            onClick={() => onRemove(story)}
          >
            <Icon name="trash" />
          </Button>
        )}
        <Button variant="ghost" size="icon" aria-label="Fechar story" onClick={onClose}>
          <Icon name="close" />
        </Button>
      </header>
      <div className="story-media">
        {story.kind === "video" ? (
          <video src={story.url} autoPlay playsInline controls onEnded={next} />
        ) : (
          <img src={story.url} alt={story.caption || "Story"} />
        )}
      </div>
      {story.caption && <p className="story-caption">{story.caption}</p>}
      <button
        type="button"
        className="story-half left"
        aria-label="Story anterior"
        onClick={prev}
      />
      <button
        type="button"
        className="story-half right"
        aria-label="Próximo story"
        onClick={next}
      />
    </div>
  );
}

/** Publicar: escolher foto ou vídeo, escrever algo e decidir quem vê. */
function StoryComposer({
  onClose,
  onPublish,
}: {
  onClose: () => void;
  onPublish: (
    f: File,
    caption: string,
    a: StoryAudience,
  ) => Promise<{ ok: boolean; error?: string }>;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const [caption, setCaption] = useState("");
  const [audience, setAudience] = useState<StoryAudience>("todos");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(
    () => () => {
      if (preview) URL.revokeObjectURL(preview);
    },
    [preview],
  );

  return (
    <Sheet title="Publicar um story" onClose={onClose}>
      {!file ? (
        <label className="sticker-pick-photo">
          <Icon name="image" />
          <b>Escolher foto ou vídeo</b>
          <small>Some sozinho em 24 horas.</small>
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp,video/mp4,video/webm"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (!f) return;
              const problem = storyProblem(f);
              if (problem) {
                setError(problem);
                return;
              }
              setError("");
              setFile(f);
              setPreview(URL.createObjectURL(f));
            }}
          />
        </label>
      ) : (
        <>
          <div className="story-preview">
            {file.type.startsWith("video") ? (
              <video src={preview} controls playsInline />
            ) : (
              <img src={preview} alt="" />
            )}
          </div>
          <label>
            Escrever algo <small>opcional</small>
            <input
              className="input"
              maxLength={MAX_CAPTION}
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="Conte em poucas palavras"
            />
          </label>
          <p className="small-note">
            {caption.length}/{MAX_CAPTION}
          </p>
          <div>
            <b>Quem pode ver</b>
            <div className="chips">
              {(
                [
                  ["todos", "Amigos e quem me segue"],
                  ["amizades", "Só amigos"],
                ] as const
              ).map(([v, label]) => (
                <Button
                  variant="ghost"
                  type="button"
                  key={v}
                  className={"chip" + (audience === v ? " active" : "")}
                  aria-pressed={audience === v}
                  onClick={() => setAudience(v)}
                >
                  {label}
                </Button>
              ))}
            </div>
          </div>
          <div className="sticker-maker-actions">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setFile(null);
                setPreview("");
              }}
            >
              Trocar
            </Button>
            <Button
              type="button"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                const r = await onPublish(file, caption, audience);
                setBusy(false);
                if (r.ok) onClose();
                else setError(r.error ?? "Não foi possível publicar.");
              }}
            >
              {busy ? "Publicando…" : "Publicar story"}
            </Button>
          </div>
        </>
      )}
      {error && (
        <p role="alert" className="form-error">
          {error}
        </p>
      )}
    </Sheet>
  );
}
