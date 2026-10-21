import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import {
  chatStickers,
  isStickerId,
  recentStickerIds,
  searchStickers,
  searchCustom,
} from "@/lib/sticker-catalogue";
import {
  addCustomSticker,
  makeSticker,
  MAX_CAPTION,
  type CustomSticker,
} from "@/lib/sticker-maker";
import type { Message } from "@/lib/friends-data";
import { Icon } from "./art";
import { useFriends } from "./store";

export function ChatSticker({
  id,
  custom,
}: {
  id: number;
  custom?: { src: string; caption: string } | undefined;
}) {
  if (custom)
    return (
      <img
        className="chat-sticker-image"
        src={custom.src}
        width={320}
        height={320}
        alt={custom.caption || "Figurinha criada"}
        draggable={false}
      />
    );
  const sticker = chatStickers[id];
  if (!sticker) return null;
  return (
    <img
      className="chat-sticker-image"
      src={sticker.src}
      width={512}
      height={512}
      alt={sticker.caption}
      draggable={false}
    />
  );
}

/** Salvar figurinha recebida, como no WhatsApp: originais vão para Favoritas; criadas por outras pessoas, para Minhas. */
export function SaveStickerButton({ message }: { message: Message }) {
  const { state, setState, notify } = useFriends();
  const c = message.custom;
  const saved = c
    ? (state.customStickers ?? []).some((s) => s.src === c.src)
    : (state.favoriteStickers ?? []).includes(message.sticker ?? -1);
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className="sticker-save"
      disabled={saved}
      onClick={() => {
        if (c)
          setState((s) => ({
            ...s,
            customStickers: addCustomSticker(s.customStickers ?? [], {
              id: "s" + Date.now(),
              src: c.src,
              caption: c.caption,
            }),
          }));
        else if (isStickerId(message.sticker))
          setState((s) => ({
            ...s,
            favoriteStickers: [
              ...new Set([...(s.favoriteStickers ?? []), message.sticker as number]),
            ],
          }));
        notify(c ? "Figurinha salva em Minhas." : "Figurinha salva nas Favoritas.");
      }}
    >
      <Icon name={saved ? "check" : "heart"} />
      {saved ? "Salva" : "Salvar figurinha"}
    </Button>
  );
}

function StickerMaker({ onDone }: { onDone: () => void }) {
  const { setState, notify } = useFriends();
  const [caption, setCaption] = useState("");
  const [src, setSrc] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  async function build(f: File, text: string) {
    setBusy(true);
    try {
      setSrc(await makeSticker(f, text));
    } catch {
      notify("Não foi possível usar essa foto. Tente outra.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="sticker-maker">
      {!src ? (
        <>
          <label className="sticker-pick-photo">
            <Icon name="image" />
            <b>Escolher foto</b>
            <small>A figurinha sai pronta, com fundo recortado.</small>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (!f) return;
                setFile(f);
                void build(f, "");
              }}
            />
          </label>
          {busy && <p className="small-note">Preparando a figurinha…</p>}
          <Button type="button" variant="secondary" className="wide" onClick={onDone}>
            Cancelar
          </Button>
        </>
      ) : (
        <>
          <div className="sticker-preview">
            <ChatSticker id={0} custom={{ src, caption }} />
          </div>
          <label>
            Escrever algo <small>opcional</small>
            <input
              className="input"
              maxLength={MAX_CAPTION}
              value={caption}
              placeholder="ex.: bora marcar"
              onChange={(e) => {
                const v = e.target.value;
                setCaption(v);
                if (file) void build(file, v);
              }}
            />
          </label>
          <div className="sticker-maker-actions">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setSrc("");
                setCaption("");
                setFile(null);
              }}
            >
              Trocar foto
            </Button>
            <Button
              type="button"
              disabled={busy}
              onClick={() => {
                setState((st) => ({
                  ...st,
                  customStickers: addCustomSticker(st.customStickers ?? [], {
                    id: "c" + Date.now(),
                    src,
                    caption: caption.trim(),
                  }),
                }));
                notify("Figurinha salva em Minhas.");
                onDone();
              }}
            >
              Salvar figurinha
            </Button>
          </div>
        </>
      )}
      <p className="small-note">
        Suas figurinhas ficam neste aparelho e podem ser enviadas nas conversas e nas tribos.
      </p>
    </div>
  );
}

type Tab = "Recentes" | "Favoritas" | "Minhas" | "Pacotes";
export function ChatStickerTray({
  onSend,
  onSendCustom,
  onClose,
}: {
  onSend: (id: number) => void;
  onSendCustom?: (c: { src: string; caption: string }) => void;
  onClose: () => void;
}) {
  const { state, setState } = useFriends();
  const [tab, setTab] = useState<Tab>("Pacotes");
  const [making, setMaking] = useState(false);
  const [query, setQuery] = useState("");
  const tray = useRef<HTMLElement>(null);
  const favorites = (state.favoriteStickers ?? []).filter(isStickerId);
  const recent = (state.recentStickers ?? []).filter(isStickerId);
  const mine: CustomSticker[] = state.customStickers ?? [];
  const base =
    tab === "Recentes" ? recent : tab === "Favoritas" ? favorites : chatStickers.map((s) => s.id);
  const found = new Set(searchStickers(query).map((s) => s.id));
  const ids = query.trim() ? base.filter((id) => found.has(id)) : base;
  const mineShown = searchCustom(mine, query);
  useEffect(() => {
    tray.current?.scrollIntoView({
      block: "nearest",
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "instant"
        : "smooth",
    });
  }, []);
  function toggleFavorite(id: number) {
    setState((s) => ({
      ...s,
      favoriteStickers: (s.favoriteStickers ?? []).includes(id)
        ? (s.favoriteStickers ?? []).filter((v) => v !== id)
        : [...(s.favoriteStickers ?? []), id],
    }));
  }
  const icons: Record<Tab, string> = {
    Recentes: "clock",
    Favoritas: "heart",
    Minhas: "plus",
    Pacotes: "stickers",
  };
  return (
    <section
      className="chat-sticker-tray"
      aria-label="Bandeja de figurinhas"
      ref={tray}
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          e.stopPropagation();
          onClose();
        }
      }}
    >
      <div className="sticker-tray-heading">
        <span>Figurinhas</span>
        <Button
          variant="ghost"
          size="icon"
          type="button"
          aria-label="Fechar figurinhas"
          onClick={onClose}
        >
          <Icon name="close" />
        </Button>
      </div>
      <label className="sticker-search">
        <Icon name="search" />
        <input
          className="input"
          type="search"
          value={query}
          placeholder="Buscar figurinha"
          aria-label="Buscar figurinha"
          onChange={(e) => setQuery(e.target.value)}
        />
        {query && (
          <Button
            variant="ghost"
            size="icon"
            type="button"
            aria-label="Limpar busca"
            onClick={() => setQuery("")}
          >
            <Icon name="close" />
          </Button>
        )}
      </label>
      <div className="sticker-tray-tabs" role="tablist" aria-label="Coleções de figurinhas">
        {(["Recentes", "Favoritas", "Minhas", "Pacotes"] as const).map((name) => (
          <Button
            type="button"
            variant="ghost"
            role="tab"
            aria-selected={tab === name}
            aria-controls="sticker-tray-panel"
            id={"sticker-tab-" + name}
            key={name}
            onClick={() => {
              setTab(name);
              setMaking(false);
            }}
          >
            <Icon name={icons[name]} />
            {name}
          </Button>
        ))}
      </div>
      <div
        id="sticker-tray-panel"
        role="tabpanel"
        aria-labelledby={"sticker-tab-" + tab}
        className="sticker-tray-panel"
      >
        {tab === "Minhas" ? (
          making ? (
            <StickerMaker onDone={() => setMaking(false)} />
          ) : (
            <div className="chat-sticker-grid">
              <div className="chat-sticker-tile">
                <Button
                  type="button"
                  variant="secondary"
                  className="sticker-create"
                  onClick={() => setMaking(true)}
                >
                  <Icon name="plus" />
                  Criar
                </Button>
              </div>
              {mineShown.map((s) => (
                <div className="chat-sticker-tile" key={s.id}>
                  <Button
                    variant="ghost"
                    type="button"
                    className="chat-sticker-send"
                    aria-label={"Enviar figurinha " + (s.caption || "criada")}
                    onClick={() => onSendCustom?.({ src: s.src, caption: s.caption })}
                  >
                    <ChatSticker id={0} custom={s} />
                  </Button>
                  <Button
                    variant="ghost"
                    type="button"
                    size="icon"
                    className="sticker-favorite"
                    aria-label={"Apagar figurinha " + (s.caption || "criada")}
                    title="Apagar"
                    onClick={() =>
                      setState((p) => ({
                        ...p,
                        customStickers: (p.customStickers ?? []).filter((v) => v.id !== s.id),
                      }))
                    }
                  >
                    <Icon name="close" />
                  </Button>
                </div>
              ))}
            </div>
          )
        ) : (
          <>
            {tab === "Pacotes" && (
              <div className="sticker-pack-heading">
                <span className="sticker-pack-mark">
                  <Icon name="stickers" />
                </span>
                <div>
                  <strong>Tribo Nommi</strong>
                  <small>24 figurinhas · pacote original</small>
                </div>
                <Icon name="check" />
              </div>
            )}
            {!ids.length ? (
              <div className="sticker-tray-empty">
                <ChatSticker id={tab === "Recentes" ? 7 : 20} />
                <p>
                  {query.trim()
                    ? "Nenhuma figurinha com esse nome."
                    : tab === "Recentes"
                      ? "Suas próximas figurinhas ficam aqui."
                      : "Ainda não há favoritas. Toque no coração numa figurinha."}
                </p>
              </div>
            ) : (
              <div className="chat-sticker-grid">
                {ids.map((id) => {
                  const s = chatStickers[id];
                  if (!s) return null;
                  return (
                    <div className="chat-sticker-tile" key={id}>
                      <Button
                        variant="ghost"
                        type="button"
                        className="chat-sticker-send"
                        aria-label={"Enviar figurinha " + s.caption}
                        onClick={() => {
                          setState((prev) => ({
                            ...prev,
                            recentStickers: recentStickerIds(prev.recentStickers ?? [], id),
                          }));
                          onSend(id);
                        }}
                      >
                        <ChatSticker id={id} />
                      </Button>
                      <Button
                        variant="ghost"
                        type="button"
                        size="icon"
                        className="sticker-favorite"
                        aria-label={
                          (favorites.includes(id) ? "Remover dos favoritos: " : "Favoritar: ") +
                          s.caption
                        }
                        aria-pressed={favorites.includes(id)}
                        title={
                          favorites.includes(id) ? "Remover dos favoritos" : "Favoritar figurinha"
                        }
                        onClick={() => toggleFavorite(id)}
                      >
                        <Icon name="heart" />
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
}
