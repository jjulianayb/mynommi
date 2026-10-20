import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Icon } from "./art";
import { Sheet } from "./surfaces";
import { useFriends } from "./store";
import {
  PRESET_BACKGROUNDS,
  coverProblem,
  coverStyle,
  uploadCover,
  saveProfileCover,
  saveTeiaCover,
  type CoverSlot,
} from "@/lib/covers";

type Target = { kind: "perfil"; userId: string } | { kind: "teia"; teiaId: number; userId: string };

/** Escolher capa (topo) ou plano de fundo: uma foto sua ou um fundo pronto da nommi. */
export function CoverEditor({
  target,
  slot,
  current,
  onSaved,
  label,
}: {
  target: Target;
  slot: CoverSlot;
  current: string;
  onSaved: (value: string) => void;
  label?: string;
}) {
  const { notify } = useFriends();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const title = slot === "cover" ? "Capa" : "Plano de fundo";

  async function save(value: string) {
    setBusy(true);
    const ok =
      target.kind === "perfil"
        ? await saveProfileCover(target.userId, slot, value)
        : await saveTeiaCover(target.teiaId, slot, value);
    setBusy(false);
    if (!ok) {
      setError("Não foi possível salvar agora.");
      return;
    }
    onSaved(value);
    notify(title + (value ? " atualizada." : " voltou ao padrão."));
    setOpen(false);
  }

  return (
    <>
      <Button
        type="button"
        variant="secondary"
        size="sm"
        className="cover-edit-button"
        onClick={() => setOpen(true)}
      >
        <Icon name="image" />
        {label ?? "Trocar " + title.toLowerCase()}
      </Button>
      {open && (
        <Sheet title={"Trocar " + title.toLowerCase()} onClose={() => setOpen(false)}>
          <div className="cover-preview" style={coverStyle(current)}>
            {!current && <span>Padrão da nommi</span>}
          </div>
          <label className="sticker-pick-photo">
            <Icon name="image" />
            <b>Enviar uma foto</b>
            <small>JPG, PNG ou WebP, até 4 MB.</small>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              disabled={busy}
              onChange={async (e) => {
                const f = e.target.files?.[0];
                if (!f) return;
                const problem = coverProblem(f);
                if (problem) {
                  setError(problem);
                  return;
                }
                setError("");
                setBusy(true);
                const path = await uploadCover(
                  target.userId,
                  slot,
                  target.kind === "perfil" ? "perfil" : target.teiaId,
                  f,
                );
                setBusy(false);
                if (!path) {
                  setError("A imagem não subiu. Tente outra.");
                  return;
                }
                await save(path);
              }}
            />
          </label>
          <b className="partner-label">Ou escolha um fundo da nommi</b>
          <div className="cover-presets">
            {PRESET_BACKGROUNDS.map((p) => (
              <button
                type="button"
                key={p.id}
                className={"cover-preset" + (current === p.id ? " active" : "")}
                style={{ background: p.css }}
                aria-label={p.label}
                title={p.label}
                disabled={busy}
                onClick={() => void save(p.id)}
              />
            ))}
          </div>
          {current && (
            <Button
              type="button"
              variant="ghost"
              className="wide"
              disabled={busy}
              onClick={() => void save("")}
            >
              Voltar ao padrão
            </Button>
          )}
          {error && (
            <p role="alert" className="form-error">
              {error}
            </p>
          )}
        </Sheet>
      )}
    </>
  );
}
