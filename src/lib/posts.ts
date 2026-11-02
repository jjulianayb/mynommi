import { PIPPO_ID } from "@/lib/pippo-tribo";
import frontalPippo from "@/assets/pippo/1-pippo-frontal.png";
import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { enderecoDaImagem } from "@/lib/covers";
import { VALIDADE_DA_MIDIA, aoVoltarParaOApp, precisaRenovar } from "./midia-que-vence";
import {
  MAIOR_FOTO_QUE_ENTRA,
  ehFoto,
  ehVideo,
  fotoParaEnviar,
  tipoParaSubir,
} from "./foto-do-post";

export type Reaction = "curtir" | "apoiar" | "rir";
export const REACTIONS: { kind: Reaction; label: string }[] = [
  { kind: "curtir", label: "Curtir" },
  { kind: "apoiar", label: "Apoiar" },
  { kind: "rir", label: "Rir" },
];
export type PostMedia = {
  id: string;
  kind: "foto" | "video";
  path: string;
  position: number;
  url?: string;
};
export type Post = {
  id: string;
  authorId: string;
  authorName: string;
  authorAvatar: string;
  teiaId: number | null;
  body: string;
  location: string;
  createdAt: string;
  media: PostMedia[];
  reactions: Record<Reaction, number>;
  myReaction: Reaction | null;
  commentCount: number;
  mine: boolean;
};
export type PostComment = {
  id: string;
  postId: string;
  authorId: string;
  author: string;
  body: string;
  createdAt: string;
  mine: boolean;
};

export const MAX_BODY = 1000;
export const MAX_COMMENT = 500;
export const MAX_MEDIA = 4;
/**
 * Teto do arquivo que **entra**. Foto é generoso porque `fotoParaEnviar()`
 * reduz tudo pelo canvas antes de subir: o que chega no balde tem uns 300 KB.
 * Conferir formato aqui foi o bug do iPhone — HEIC era recusado. Ver
 * `src/lib/foto-do-post.ts`.
 */
export const MAX_PHOTO_BYTES = MAIOR_FOTO_QUE_ENTRA;
export const MAX_VIDEO_BYTES = 30 * 1024 * 1024;
const BUCKET = "post-media";

/** Texto do post: de 1 a 1000 letras, sem espaços nas pontas. */
export function cleanBody(text: string, max = MAX_BODY): string | null {
  const t = text.replace(/\s+\n/g, "\n").trim();
  return t.length >= 1 && t.length <= max ? t : null;
}

/** Confere um arquivo antes de enviar: tipo, tamanho e quantidade. Devolve a mensagem de erro ou null. */
export function mediaProblem(
  file: { type: string; size: number },
  alreadyAttached: number,
): string | null {
  if (alreadyAttached >= MAX_MEDIA) return `No máximo ${MAX_MEDIA} fotos ou vídeos por post.`;
  if (ehFoto(file.type)) return file.size > MAX_PHOTO_BYTES ? "Essa foto é grande demais." : null;
  if (ehVideo(file.type))
    return file.size > MAX_VIDEO_BYTES ? "O vídeo passa de 30 MB." : null;
  return "Anexe uma foto ou um vídeo.";
}
export const mediaKind = (type: string): "foto" | "video" => (ehVideo(type) ? "video" : "foto");

/** Caminho no armazenamento: sempre começa pelo id de quem envia (é o que a regra de segurança confere). */
export function mediaPath(userId: string, postId: string, position: number, type: string) {
  // Foto sempre sai daqui como JPEG (passou pelo canvas), então a extensão é
  // decidida pelo tipo **que vai subir**, não pelo que o celular mandou.
  const ext = ehVideo(type)
    ? type === "video/webm"
      ? "webm"
      : "mp4"
    : type === "image/png"
      ? "png"
      : type === "image/webp"
        ? "webp"
        : "jpg";
  return `${userId}/${postId}/${position}.${ext}`;
}

/** "agora", "há 5 min", "há 3 h", "ontem", "há 4 dias" ou a data. */
export function timeAgo(iso: string, now = Date.now()): string {
  const s = Math.max(0, Math.floor((now - new Date(iso).getTime()) / 1000));
  if (s < 60) return "agora";
  if (s < 3600) return `há ${Math.floor(s / 60)} min`;
  if (s < 86400) return `há ${Math.floor(s / 3600)} h`;
  const d = Math.floor(s / 86400);
  if (d === 1) return "ontem";
  if (d < 7) return `há ${d} dias`;
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
}

type Row = {
  id: string;
  author_id: string;
  teia_id: number | null;
  body: string;
  location: string;
  created_at: string;
  post_media?: { id: string; kind: "foto" | "video"; path: string; position: number }[];
  post_reactions?: { user_id: string; kind: Reaction }[];
  post_comments?: { count: number }[];
};

/** Monta o post a partir da linha do servidor (função pura, testada). */
export function toPost(
  r: Row,
  me: string,
  authors: Record<string, { nickname: string; avatar_url: string }>,
): Post {
  const reactions: Record<Reaction, number> = { curtir: 0, apoiar: 0, rir: 0 };
  let mine: Reaction | null = null;
  for (const x of r.post_reactions ?? []) {
    reactions[x.kind] += 1;
    if (x.user_id === me) mine = x.kind;
  }
  const a = authors[r.author_id];
  return {
    id: r.id,
    authorId: r.author_id,
    authorName: r.author_id === PIPPO_ID ? "Pippo" : a?.nickname || "nommi",
    authorAvatar:
      r.author_id === PIPPO_ID ? frontalPippo : enderecoDaImagem(a?.avatar_url ?? ""),
    teiaId: r.teia_id,
    body: r.body,
    location: r.location,
    createdAt: r.created_at,
    media: [...(r.post_media ?? [])].sort((x, y) => x.position - y.position),
    reactions,
    myReaction: mine,
    commentCount: r.post_comments?.[0]?.count ?? 0,
    mine: r.author_id === me,
  };
}
export const totalReactions = (p: Pick<Post, "reactions">) =>
  p.reactions.curtir + p.reactions.apoiar + p.reactions.rir;

export type FeedScope = { teiaId?: number; authorId?: string };

export async function loadPosts(me: string, scope: FeedScope = {}, limit = 30): Promise<Post[]> {
  let q = supabase
    .from("posts")
    .select(
      "id,author_id,teia_id,body,location,created_at,post_media(id,kind,path,position),post_reactions(user_id,kind),post_comments(count)",
    )
    .eq("status", "publicado")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (scope.teiaId != null) q = q.eq("teia_id", scope.teiaId);
  if (scope.authorId) q = q.eq("author_id", scope.authorId);
  const { data } = await q;
  const rows = (data as Row[] | null) ?? [];
  const ids = [...new Set(rows.map((r) => r.author_id))];
  const authors: Record<string, { nickname: string; avatar_url: string }> = {};
  if (ids.length) {
    const { data: ps } = await supabase
      .from("profiles")
      .select("id,nickname,avatar_url")
      .in("id", ids);
    for (const p of (ps as { id: string; nickname: string; avatar_url: string }[] | null) ?? [])
      authors[p.id] = p;
  }
  const posts = rows.map((r) => toPost(r, me, authors));
  await attachMediaUrls(posts);
  return posts;
}

/**
 * Links temporários das fotos e vídeos: o armazenamento é fechado.
 * O prazo mora em `VALIDADE_DA_MIDIA`, um lugar só — já foi 1 hora, e numa
 * página que fica aberta por dias isso quebrava a tela de todo mundo que
 * voltava ao app depois do almoço.
 */
async function attachMediaUrls(posts: Post[]) {
  const all = posts.flatMap((p) => p.media);
  if (!all.length) return;
  const { data } = await supabase.storage.from(BUCKET).createSignedUrls(
    all.map((m) => m.path),
    VALIDADE_DA_MIDIA,
  );
  const byPath = new Map((data ?? []).map((d) => [d.path ?? "", d.signedUrl]));
  for (const m of all) {
    const url = byPath.get(m.path);
    if (url) m.url = url;
  }
}

export type NewPost = { body: string; teiaId?: number | null; location?: string; files?: File[] };
export type CreateResult = { ok: true; id: string } | { ok: false; error: string };

/** Publica o post e envia as mídias. Se um arquivo falhar, o post é desfeito para não ficar pela metade. */
export async function createPost(me: string, input: NewPost): Promise<CreateResult> {
  const body = cleanBody(input.body);
  if (!body) return { ok: false, error: "Escreva de 1 a 1000 letras." };
  const escolhidos = [...(input.files ?? [])];
  for (let i = 0; i < escolhidos.length; i++) {
    const p = mediaProblem(escolhidos[i]!, i);
    if (p) return { ok: false, error: p };
  }
  // A foto passa pelo canvas **antes** de o post existir: se o navegador não
  // conseguir abrir a imagem, ninguém fica com post pela metade.
  const files: File[] = [];
  for (const f of escolhidos) {
    if (!ehFoto(f.type)) {
      files.push(f);
      continue;
    }
    const pronta = await fotoParaEnviar(f);
    if (!pronta)
      return { ok: false, error: "Não consegui abrir essa foto. Tente outra ou tire na hora." };
    files.push(pronta);
  }
  const { data, error } = await supabase
    .from("posts")
    .insert({
      author_id: me,
      teia_id: input.teiaId ?? null,
      body,
      location: (input.location ?? "").trim().slice(0, 80),
    })
    .select("id")
    .single();
  if (error || !data) return { ok: false, error: "Não foi possível publicar. Tente de novo." };
  const id = (data as { id: string }).id;
  for (let i = 0; i < files.length; i++) {
    const file = files[i]!;
    const tipo = tipoParaSubir(file.type);
    const path = mediaPath(me, id, i, tipo);
    const up = await supabase.storage.from(BUCKET).upload(path, file, { contentType: tipo });
    const ins = up.error
      ? null
      : await supabase
          .from("post_media")
          .insert({ post_id: id, kind: mediaKind(file.type), path, position: i });
    if (up.error || ins?.error) {
      await deletePost(id);
      return { ok: false, error: "Um dos arquivos não subiu. O post não foi publicado." };
    }
  }
  return { ok: true, id };
}

export async function deletePost(id: string) {
  const { data } = await supabase.from("post_media").select("path").eq("post_id", id);
  const paths = ((data as { path: string }[] | null) ?? []).map((x) => x.path);
  if (paths.length) await supabase.storage.from(BUCKET).remove(paths);
  const { error } = await supabase.from("posts").delete().eq("id", id);
  return !error;
}

/** Reage; tocar na mesma reação de novo a remove; tocar em outra troca. */
export async function setReaction(
  me: string,
  postId: string,
  current: Reaction | null,
  next: Reaction,
) {
  if (current === next) {
    const { error } = await supabase
      .from("post_reactions")
      .delete()
      .eq("post_id", postId)
      .eq("user_id", me);
    return !error;
  }
  const { error } = await supabase
    .from("post_reactions")
    .upsert({ post_id: postId, user_id: me, kind: next }, { onConflict: "post_id,user_id" });
  return !error;
}

export function usePosts(me: string | null, scope: FeedScope = {}) {
  const [posts, setPosts] = useState<Post[]>([]);
  const [ready, setReady] = useState(false);
  const key = `${scope.teiaId ?? ""}|${scope.authorId ?? ""}`;
  const reload = useCallback(async () => {
    if (!me) return;
    setPosts(await loadPosts(me, scope));
    setReady(true);
  }, [me, key]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    void reload();
  }, [reload]);

  /**
   * Recarrega quando o app volta para a frente depois de um tempo parado.
   *
   * Os endereços das fotos vencem, e a nommi é uma página só que fica aberta
   * por dias. Sem isto, quem voltava ao app depois do almoço via o feed com
   * todas as fotos quebradas — e fechar e abrir era a única saída, coisa que
   * ninguém descobre sozinho.
   */
  const pedidoEm = useRef<number | null>(null);
  useEffect(() => {
    pedidoEm.current = ready ? Date.now() : null;
  }, [ready, posts]);
  useEffect(() => {
    if (!me) return;
    return aoVoltarParaOApp(() => {
      if (precisaRenovar(pedidoEm.current)) void reload();
    });
  }, [me, reload]);

  const react = async (p: Post, kind: Reaction) => {
    if (!me) return false;
    const ok = await setReaction(me, p.id, p.myReaction, kind);
    await reload();
    return ok;
  };
  const publish = async (input: NewPost) => {
    if (!me) return { ok: false, error: "Entre para publicar." } as CreateResult;
    const r = await createPost(me, input);
    if (r.ok) await reload();
    return r;
  };
  const remove = async (id: string) => {
    const ok = await deletePost(id);
    await reload();
    return ok;
  };
  return { posts, ready, reload, react, publish, remove };
}

export function useComments(me: string | null, postId: string | null) {
  const [items, setItems] = useState<PostComment[]>([]);
  const load = useCallback(async () => {
    if (!me || !postId) return;
    const { data } = await supabase
      .from("post_comments")
      .select("id,post_id,author_id,author,body,created_at")
      .eq("post_id", postId)
      .order("created_at")
      .limit(200);
    setItems(
      (
        (data as
          | {
              id: string;
              post_id: string;
              author_id: string;
              author: string;
              body: string;
              created_at: string;
            }[]
          | null) ?? []
      ).map((c) => ({
        id: c.id,
        postId: c.post_id,
        authorId: c.author_id,
        author: c.author || "nommi",
        body: c.body,
        createdAt: c.created_at,
        mine: c.author_id === me,
      })),
    );
  }, [me, postId]);
  useEffect(() => {
    if (!me || !postId) return;
    void load();
    const ch = supabase
      .channel("comments-" + postId)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "post_comments", filter: "post_id=eq." + postId },
        () => {
          void load();
        },
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(ch);
    };
  }, [me, postId, load]);
  const add = async (text: string, nickname: string) => {
    const body = cleanBody(text, MAX_COMMENT);
    if (!me || !postId || !body) return false;
    const { error } = await supabase
      .from("post_comments")
      .insert({ post_id: postId, author_id: me, author: nickname.slice(0, 40), body });
    await load();
    return !error;
  };
  const remove = async (id: string) => {
    const { error } = await supabase.from("post_comments").delete().eq("id", id);
    await load();
    return !error;
  };
  return { items, add, remove, reload: load };
}
