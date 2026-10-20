import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { novo } from "./cloud-novo";

export type StoryAudience = "todos" | "amizades";
export type Story = {
  id: string;
  authorId: string;
  authorName: string;
  authorAvatar: string;
  kind: "foto" | "video";
  path: string;
  caption: string;
  audience: StoryAudience;
  createdAt: string;
  expiresAt: string;
  url?: string;
  seen: boolean;
  mine: boolean;
};
export type StoryGroup = {
  authorId: string;
  authorName: string;
  authorAvatar: string;
  stories: Story[];
  allSeen: boolean;
  mine: boolean;
};

export const MAX_CAPTION = 140;
export const MAX_STORY_PHOTO = 5 * 1024 * 1024;
export const MAX_STORY_VIDEO = 50 * 1024 * 1024;
const PHOTOS = ["image/jpeg", "image/png", "image/webp"];
const VIDEOS = ["video/mp4", "video/webm"];
const BUCKET = "stories";

/** Confere o arquivo do story. Devolve o erro em português ou null. */
export function storyProblem(file: { type: string; size: number }): string | null {
  if (PHOTOS.includes(file.type))
    return file.size > MAX_STORY_PHOTO ? "A foto passa de 5 MB." : null;
  if (VIDEOS.includes(file.type))
    return file.size > MAX_STORY_VIDEO ? "O vídeo passa de 50 MB." : null;
  return "Use foto JPG, PNG ou WebP, ou vídeo MP4 ou WebM.";
}
export const storyKind = (type: string): "foto" | "video" =>
  VIDEOS.includes(type) ? "video" : "foto";
export function storyPath(userId: string, type: string, now = Date.now()) {
  const ext =
    type === "image/png"
      ? "png"
      : type === "image/webp"
        ? "webp"
        : type === "video/mp4"
          ? "mp4"
          : type === "video/webm"
            ? "webm"
            : "jpg";
  return `${userId}/${now}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
}

/** Quanto falta para o story sumir. */
export function timeLeft(expiresAt: string, now = Date.now()): string {
  const min = Math.floor((new Date(expiresAt).getTime() - now) / 60000);
  if (min <= 0) return "acabou";
  if (min < 60) return `some em ${min} min`;
  return `some em ${Math.floor(min / 60)} h`;
}

type Row = {
  id: string;
  author_id: string;
  kind: "foto" | "video";
  path: string;
  caption: string;
  audience: StoryAudience;
  created_at: string;
  expires_at: string;
};

/** Agrupa por pessoa, na ordem: os meus primeiro, depois quem tem story não visto. */
export function groupStories(list: Story[], me: string): StoryGroup[] {
  const by = new Map<string, Story[]>();
  for (const s of list) by.set(s.authorId, [...(by.get(s.authorId) ?? []), s]);
  const groups: StoryGroup[] = [...by.entries()].map(([authorId, stories]) => {
    const ordered = [...stories].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    const first = ordered[0]!;
    return {
      authorId,
      authorName: first.authorName,
      authorAvatar: first.authorAvatar,
      stories: ordered,
      allSeen: ordered.every((s) => s.seen),
      mine: authorId === me,
    };
  });
  return groups.sort(
    (a, b) =>
      Number(b.mine) - Number(a.mine) ||
      Number(a.allSeen) - Number(b.allSeen) ||
      a.authorName.localeCompare(b.authorName),
  );
}

export function useStories(me: string | null) {
  const [groups, setGroups] = useState<StoryGroup[]>([]);
  const [ready, setReady] = useState(false);

  const load = useCallback(async () => {
    if (!me) return;
    const { data } = await novo
      .from("stories")
      .select("id,author_id,kind,path,caption,audience,created_at,expires_at")
      .gt("expires_at", new Date().toISOString())
      .order("created_at")
      .limit(200);
    const rows = (data as Row[] | null) ?? [];
    if (!rows.length) {
      setGroups([]);
      setReady(true);
      return;
    }
    const ids = [...new Set(rows.map((r) => r.author_id))];
    const [{ data: profs }, { data: views }, { data: urls }] = await Promise.all([
      supabase.from("profiles").select("id,nickname,avatar_url").in("id", ids),
      novo.from("story_views").select("story_id").eq("viewer_id", me),
      supabase.storage.from(BUCKET).createSignedUrls(
        rows.map((r) => r.path),
        3600,
      ),
    ]);
    const who = new Map(
      ((profs as { id: string; nickname: string; avatar_url: string }[] | null) ?? []).map((p) => [
        p.id,
        p,
      ]),
    );
    const seen = new Set(((views as { story_id: string }[] | null) ?? []).map((v) => v.story_id));
    const link = new Map((urls ?? []).map((u) => [u.path ?? "", u.signedUrl]));
    const list: Story[] = rows.map((r) => {
      const p = who.get(r.author_id);
      const url = link.get(r.path);
      return {
        id: r.id,
        authorId: r.author_id,
        authorName: p?.nickname || "nommi",
        authorAvatar: p?.avatar_url ?? "",
        kind: r.kind,
        path: r.path,
        caption: r.caption,
        audience: r.audience,
        createdAt: r.created_at,
        expiresAt: r.expires_at,
        ...(url ? { url } : {}),
        seen: seen.has(r.id),
        mine: r.author_id === me,
      };
    });
    setGroups(groupStories(list, me));
    setReady(true);
  }, [me]);

  useEffect(() => {
    void load();
  }, [load]);

  const publish = async (file: File, caption: string, audience: StoryAudience = "todos") => {
    if (!me) return { ok: false as const, error: "Entre para publicar." };
    const problem = storyProblem(file);
    if (problem) return { ok: false as const, error: problem };
    const path = storyPath(me, file.type);
    const up = await supabase.storage.from(BUCKET).upload(path, file, { contentType: file.type });
    if (up.error) return { ok: false as const, error: "O arquivo não subiu. Tente de novo." };
    const { error } = await novo.from("stories").insert({
      author_id: me,
      kind: storyKind(file.type),
      path,
      caption: caption.trim().slice(0, MAX_CAPTION),
      audience,
    });
    if (error) {
      await supabase.storage.from(BUCKET).remove([path]);
      return { ok: false as const, error: "Não foi possível publicar agora." };
    }
    await load();
    return { ok: true as const };
  };

  const markSeen = async (story: Story) => {
    if (!me || story.mine || story.seen) return;
    await novo.from("story_views").insert({ story_id: story.id, viewer_id: me });
    setGroups((gs) =>
      gs.map((g) => ({
        ...g,
        stories: g.stories.map((s) => (s.id === story.id ? { ...s, seen: true } : s)),
        allSeen: g.stories.every((s) => s.id === story.id || s.seen),
      })),
    );
  };

  const remove = async (story: Story) => {
    if (!me || !story.mine) return false;
    await supabase.storage.from(BUCKET).remove([story.path]);
    const { error } = await novo.from("stories").delete().eq("id", story.id);
    await load();
    return !error;
  };

  return { groups, ready, reload: load, publish, markSeen, remove };
}
