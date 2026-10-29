import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { SemFoto, Avatar, Icon } from "./art";
import { Sheet } from "./surfaces";
import { CameraStory } from "./camera-story";
import { useStories, timeLeft, type Story, type StoryGroup } from "@/lib/stories";

function Face({ name, avatar, size = 56 }: { name: string; avatar: string; size?: number }) {
  if (avatar) return <img className="story-face" src={avatar} alt="" width={size} height={size} />;
  return <SemFoto nome={name} size={size} />;
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
        <div className={"story-bubble add" + (mine ? " tem" : "")}>
          <button
            type="button"
            className="story-abre"
            aria-label={mine ? "Ver o seu story" : "Publicar um story"}
            onClick={() => (mine ? setOpen(mine) : setPosting(true))}
          >
            <span className={"story-ring" + (mine ? " viva" : " new")}>
              <Face name={nickname} avatar={mine?.authorAvatar ?? ""} />
            </span>
            <small>{mine ? "Seu story" : "Adicionar"}</small>
          </button>
          <button
            type="button"
            className="story-plus"
            aria-label="Publicar um story"
            onClick={() => setPosting(true)}
          >
            <Icon name="plus" />
          </button>
        </div>
        {groups
          .filter((g) => !g.mine)
          .map((g) => (
            <button
              type="button"
              key={g.authorId}
              className="story-bubble"
              onClick={() => setOpen(g)}
            >
              <span className={"story-ring" + (g.allSeen ? " seen" : " viva")}>
                <Face name={g.authorName} avatar={g.authorAvatar} />
              </span>
              <small>{g.authorName.split(" ")[0]}</small>
            </button>
          ))}
        {groups.length === 0 && (
          <p className="small-note stories-empty">Ninguém publicou story ainda. Comece você.</p>
        )}
      </section>
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
      {posting && <CameraStory onClose={() => setPosting(false)} onPublish={publish} />}
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
