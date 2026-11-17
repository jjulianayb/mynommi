import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { venceEm, quantoFalta } from "./camera";
import { enderecoDaImagem } from "@/lib/covers";
import { VALIDADE_DA_MIDIA, aoVoltarParaOApp, precisaRenovar } from "./midia-que-vence";

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
const PHOTOS = ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"];
const VIDEOS = ["video/mp4", "video/webm", "video/quicktime", "video/x-m4v", "video/3gpp"];
const BUCKET = "stories";

/** Confere o arquivo do story. Devolve o erro em português ou null. */
export function storyProblem(file: { type: string; size: number }): string | null {
  if (PHOTOS.includes(file.type))
    return file.size > MAX_STORY_PHOTO ? "A foto passa de 5 MB." : null;
  if (VIDEOS.includes(file.type) || file.type.startsWith("video/"))
    return file.size > MAX_STORY_VIDEO ? "O vídeo passa de 50 MB." : null;
  if (file.type.startsWith("image/"))
    return file.size > MAX_STORY_PHOTO ? "A foto passa de 5 MB." : null;
  return "Use uma foto ou um vídeo MP4 ou WebM.";
}
export const storyKind = (type: string): "foto" | "video" =>
  type.startsWith("video/") ? "video" : "foto";
/**
 * Com que tipo o vídeo é anunciado ao navegador que vai tocar.
 *
 * `.mov` do iPhone, `.m4v` e `.3gp` são o **mesmo recipiente** do `.mp4`
 * (ISO BMFF) com assinatura diferente: o Chrome do Android recusa de cara
 * qualquer coisa anunciada como `video/quicktime`, mas toca o conteúdo quando
 * vem como `video/mp4`. É a mesma decisão já tomada para a foto do post em
 * 02/11 (`tipoParaSubir`), aqui para o story.
 *
 * Foto não é normalizada: ela sobe com o tipo que tem, porque quem converte é
 * o canvas da câmera, antes de chegar aqui.
 */
export function tipoDoStory(type: string): string {
  if (!type.startsWith("video/")) return type;
  return type === "video/webm" ? "video/webm" : "video/mp4";
}

/**
 * O caminho no balde. A extensão tem que bater com o tipo anunciado — era
 * exatamente isso que estava errado: **todo** vídeo que não fosse mp4 virava
 * `.webm`, inclusive o `.mov` do iPhone, que `storyProblem()` aceita. O
 * arquivo subia com extensão que não corresponde ao conteúdo.
 */
export function storyPath(userId: string, type: string, now = Date.now()) {
  const ext = type.startsWith("video/")
    ? tipoDoStory(type) === "video/webm"
      ? "webm"
      : "mp4"
    : type === "image/png"
      ? "png"
      : type === "image/webp"
        ? "webp"
        : "jpg";
  return `${userId}/${now}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
}

/** Quanto falta para o story sumir. */
export const timeLeft = quantoFalta;

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

/** Story cujo arquivo não existe mais não entra na fita. */
export const soComLink = (s: Story) => !!s.url;

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
    const { data } = await supabase
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
      supabase.from("story_views").select("story_id").eq("viewer_id", me),
      supabase.storage.from(BUCKET).createSignedUrls(
        rows.map((r) => r.path),
        VALIDADE_DA_MIDIA,
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
        authorAvatar: enderecoDaImagem(p?.avatar_url ?? ""),
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
    }).filter(soComLink);
    setGroups(groupStories(list, me));
    setReady(true);
  }, [me]);

  useEffect(() => {
    void load();
  }, [load]);

  // Mesmo motivo do feed: endereço de story vence, e o app fica aberto por
  // dias. Sem isto a fita de stories aparece toda quebrada ao voltar.
  const pedidoEm = useRef<number | null>(null);
  useEffect(() => {
    pedidoEm.current = ready ? Date.now() : null;
  }, [ready, groups]);
  useEffect(() => {
    if (!me) return;
    return aoVoltarParaOApp(() => {
      if (precisaRenovar(pedidoEm.current)) void load();
    });
  }, [me, load]);

  const publish = async (file: File, caption: string, audience: StoryAudience = "todos") => {
    if (!me) return { ok: false as const, error: "Entre para publicar." };
    const problem = storyProblem(file);
    if (problem) return { ok: false as const, error: problem };
    const path = storyPath(me, file.type);
    const up = await supabase.storage
      .from(BUCKET)
      .upload(path, file, { contentType: tipoDoStory(file.type) });
    if (up.error) return { ok: false as const, error: "O arquivo não subiu. Tente de novo." };
    const { error } = await supabase.from("stories").insert({
      author_id: me,
      kind: storyKind(file.type),
      path,
      caption: caption.trim().slice(0, MAX_CAPTION),
      audience,
      expires_at: venceEm(),
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
    await supabase.from("story_views").insert({ story_id: story.id, viewer_id: me });
    setGroups((gs) =>
      gs.map((g) => ({
        ...g,
        stories: g.stories.map((s) => (s.id === story.id ? { ...s, seen: true } : s)),
        allSeen: g.stories.every((s) => s.id === story.id || s.seen),
      })),
    );
  };

  /**
   * A linha sai **antes** do arquivo, e a ordem é o conserto.
   *
   * Era o contrário: apagava o arquivo do balde e só depois a linha. Se a
   * segunda parte falhasse (permissão, rede, aba fechada no meio), o arquivo
   * já tinha ido e a linha ficava — e `soComLink` esconde em silêncio todo
   * story cujo arquivo não gera endereço. Dá exatamente a assinatura do caso
   * da Ana em 01/11: linha no banco, arquivo sumido do balde, story invisível
   * sem erro nenhum.
   *
   * Nesta ordem, falhar no meio deixa no máximo um arquivo órfão no balde, que
   * ninguém vê e que não quebra tela nenhuma.
   */
  const remove = async (story: Story) => {
    if (!me || !story.mine) return false;
    const { error } = await supabase.from("stories").delete().eq("id", story.id);
    if (error) return false;
    await supabase.storage.from(BUCKET).remove([story.path]);
    await load();
    return true;
  };

  return { groups, ready, reload: load, publish, markSeen, remove };
}
