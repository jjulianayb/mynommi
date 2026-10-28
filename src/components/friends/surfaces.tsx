import { useEffect, useRef, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Icon, Sticker } from "./art";
export function Sheet({
  title,
  onClose,
  children,
  side = "bottom",
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  side?: "bottom" | "right";
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [closing, setClosing] = useState(false);
  useEffect(() => {
    const el = ref.current;
    el?.showModal();
    const old = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      if (timer.current) clearTimeout(timer.current);
      el?.close();
      document.body.style.overflow = old;
    };
  }, []);
  function close() {
    if (closing) return;
    setClosing(true);
    timer.current = setTimeout(
      onClose,
      window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 200,
    );
  }
  return (
    <dialog
      ref={ref}
      className={
        "nomi-sheet " +
        (side === "right" ? "nommi-drawer " : "") +
        (closing ? "surface-closing" : "")
      }
      onCancel={(e) => {
        e.preventDefault();
        close();
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) close();
      }}
      aria-label={title}
    >
      <div className="sheet-handle" />
      <div className="sheet-heading">
        <h2>{title}</h2>
        <Button variant="ghost" size="icon" aria-label="Fechar" onClick={close}>
          <Icon name="close" />
        </Button>
      </div>
      {children}
    </dialog>
  );
}
export function LoadingState() {
  return (
    <div className="loading-state" role="status" aria-label="Carregando">
      <span className="skeleton skeleton-circle" />
      <span className="skeleton skeleton-line" />
      <span className="skeleton skeleton-banner" />
      <div className="skeleton-grid">
        <span className="skeleton" />
        <span className="skeleton" />
        <span className="skeleton" />
      </div>
      <span className="sr-only">Carregando seu Nommi</span>
    </div>
  );
}
export function EmptyState({
  title,
  text,
  children,
}: {
  title: string;
  text: string;
  children?: ReactNode;
}) {
  return (
    <div className="empty-state">
      <Sticker id={4} size={112} />
      <h2>{title}</h2>
      <p>{text}</p>
      {children}
    </div>
  );
}
export const TAGLINE = "Encontre sua tribo";
export function BrandMark({ tagline = true }: { tagline?: boolean }) {
  return (
    <>
      <span className="brand-word" aria-hidden="true">
        nomm
        <span className="brand-i">
          ı<span className="brand-dot" />
        </span>
      </span>
      {tagline && (
        <span className="brand-tagline" aria-hidden="true">
          {TAGLINE}
        </span>
      )}
    </>
  );
}
export function Brand({ tagline = true }: { tagline?: boolean }) {
  return (
    <span className="wordmark" role="img" aria-label={"nommi — " + TAGLINE}>
      <BrandMark tagline={tagline} />
    </span>
  );
}

/**
 * Espera com a cara do que vem depois. "Carregando…" escrito em cinza é o que
 * mais faz um app parecer máquina: a pessoa olha para uma frase, não para o app.
 */
export function Esqueleto({ tipo }: { tipo: "fila" | "cartoes" | "perfil" | "conversa" }) {
  if (tipo === "perfil")
    return (
      <div className="esqueleto" aria-hidden="true">
        <span className="e-capa" />
        <div className="e-linha">
          <span className="e-foto" />
          <div>
            <span className="e-texto larga" />
            <span className="e-texto curta" />
          </div>
        </div>
        <span className="e-bloco" />
        <span className="e-bloco baixo" />
      </div>
    );
  if (tipo === "conversa")
    return (
      <div className="esqueleto" aria-hidden="true">
        {[0, 1, 2].map((i) => (
          <div className="e-linha" key={i}>
            <span className="e-foto pequena" />
            <div>
              <span className="e-texto larga" />
              <span className="e-texto curta" />
            </div>
          </div>
        ))}
      </div>
    );
  if (tipo === "cartoes")
    return (
      <div className="esqueleto" aria-hidden="true">
        <span className="e-bloco alto" />
        <span className="e-bloco" />
      </div>
    );
  return (
    <div className="esqueleto" aria-hidden="true">
      <div className="e-fila">
        {[0, 1, 2, 3].map((i) => (
          <span className="e-foto" key={i} />
        ))}
      </div>
      <span className="e-bloco" />
    </div>
  );
}
