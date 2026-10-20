import { useCallback, useEffect, useState } from "react";
import { cloud } from "./cloud";

export type RoleRow = {
  id: number;
  kind: "teia" | "role";
  name: string;
  mode: string;
  category: string | null;
  city: string;
  place: string;
  when_text: string;
  creator_nickname: string;
  created_at: string;
  starts_at: string | null;
  capacity: number | null;
  going_count: number;
  i_am_going: boolean;
};
export type Role = {
  id: number;
  name: string;
  mode: string;
  category: string;
  city: string;
  place: string;
  whenText: string;
  host: string;
  startsAt: Date | null;
  capacity: number | null;
  going: number;
  iAmGoing: boolean;
  spotsLeft: number | null;
  full: boolean;
  past: boolean;
};

export const MIN_CAPACITY = 2;
export const MAX_CAPACITY = 100;

/** Linha do servidor → rolê, já com vagas restantes e se já passou. */
export function toRole(r: RoleRow, now = new Date()): Role {
  const startsAt = r.starts_at ? new Date(r.starts_at) : null;
  const spotsLeft = r.capacity == null ? null : Math.max(0, r.capacity - r.going_count);
  return {
    id: r.id,
    name: r.name,
    mode: r.mode,
    category: r.category ?? "",
    city: r.city,
    place: r.place,
    whenText: r.when_text,
    host: r.creator_nickname,
    startsAt,
    capacity: r.capacity,
    going: r.going_count,
    iAmGoing: r.i_am_going,
    spotsLeft,
    full: spotsLeft === 0,
    past: !!startsAt && startsAt.getTime() <= now.getTime(),
  };
}

/** "Sábado, 14 de jun, 16h" a partir da data; se não houver data, usa o texto livre. */
export function whenLabel(r: Pick<Role, "startsAt" | "whenText">): string {
  if (!r.startsAt) return r.whenText;
  const d = r.startsAt.toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "short",
  });
  const h = r.startsAt.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  return `${d.charAt(0).toUpperCase() + d.slice(1)}, ${h}`;
}

/** Texto das vagas, sem número quando não há limite. */
export function spotsLabel(r: Pick<Role, "capacity" | "going" | "spotsLeft">): string {
  if (r.capacity == null) return `${r.going} ${r.going === 1 ? "pessoa vai" : "pessoas vão"}`;
  if (r.spotsLeft === 0) return "Lotado";
  return `${r.going}/${r.capacity} · ${r.spotsLeft} ${r.spotsLeft === 1 ? "vaga" : "vagas"}`;
}

/** Por que o botão "Quero ir" está desligado, ou null se pode ir. */
export function goingBlocker(r: Role, isHost: boolean): string | null {
  if (isHost) return "Você é quem organiza.";
  if (r.past) return "Esse rolê já aconteceu.";
  if (r.full && !r.iAmGoing) return "As vagas acabaram.";
  return null;
}

/** Rolês primeiro: os que ainda vão acontecer, do mais próximo ao mais distante; depois os sem data; por último os que passaram. */
export function sortRoles(list: Role[], now = new Date()): Role[] {
  const rank = (r: Role) => (r.past ? 2 : r.startsAt ? 0 : 1);
  return [...list].sort(
    (a, b) =>
      rank(a) - rank(b) ||
      (a.startsAt?.getTime() ?? Infinity) - (b.startsAt?.getTime() ?? Infinity) ||
      b.id - a.id,
  );
}

export function useRoles(me: string | null) {
  const [roles, setRoles] = useState<Role[]>([]);
  const [ready, setReady] = useState(false);
  const load = useCallback(async () => {
    if (!me) return;
    const { data } = await cloud.rpc("list_teias", {});
    const rows = ((data as RoleRow[] | null) ?? []).filter((r) => r.kind === "role");
    setRoles(sortRoles(rows.map((r) => toRole(r))));
    setReady(true);
  }, [me]);
  useEffect(() => {
    void load();
  }, [load]);
  const toggleGoing = async (r: Role) => {
    if (!me) return false;
    const { error } = r.iAmGoing
      ? await cloud.from("teia_rsvps").delete().eq("teia_id", r.id).eq("user_id", me)
      : await cloud.from("teia_rsvps").insert({ teia_id: r.id, user_id: me });
    await load();
    return !error;
  };
  return { roles, ready, reload: load, toggleGoing };
}

export type NewRole = {
  name: string;
  city: string;
  place?: string;
  mode?: string;
  category?: string;
  startsAt?: Date | null;
  capacity?: number | null;
  whenText?: string;
};

export async function createRole(me: string, nickname: string, input: NewRole) {
  const name = input.name.trim();
  if (name.length < 3 || name.length > 60) return null;
  const capacity =
    input.capacity == null
      ? null
      : Math.min(MAX_CAPACITY, Math.max(MIN_CAPACITY, Math.round(input.capacity)));
  const { data, error } = await cloud
    .from("teias")
    .insert({
      kind: "role",
      name,
      mode: input.mode ?? "Presencial",
      category: input.category ?? null,
      city: input.city.trim().slice(0, 80),
      place: (input.place ?? "").trim().slice(0, 80),
      when_text: (input.whenText ?? "").trim().slice(0, 60),
      starts_at: input.startsAt?.toISOString() ?? null,
      capacity,
      created_by: me,
      creator_nickname: nickname.slice(0, 40),
    })
    .select("id")
    .single();
  if (error || !data) return null;
  const id = (data as { id: string }).id;
  await cloud.from("teia_rsvps").insert({ teia_id: id, user_id: me });
  return id;
}

/** Quem disse "Quero ir" (só o organizador consegue ler). */
export async function loadGoing(roleId: number) {
  const { data } = await cloud.from("teia_rsvps").select("user_id").eq("teia_id", roleId);
  const ids = ((data as { user_id: string }[] | null) ?? []).map((x) => x.user_id);
  if (!ids.length) return [];
  const { data: ps } = await cloud.from("profiles").select("id,nickname,avatar_url").in("id", ids);
  return (ps as { id: string; nickname: string; avatar_url: string }[] | null) ?? [];
}
