import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Icon } from "./art";
import { Sheet } from "./surfaces";
import {
  platformOf,
  installSteps,
  isStandalone,
  shouldOffer,
  type InstallPlatform,
} from "@/lib/install";

type InstallEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: string }>;
};
const KEY = "nommi-instalar-dispensado";

/** Convite discreto para deixar a nommi na tela de início do celular. */
export function InstallBanner() {
  const [show, setShow] = useState(false);
  const [steps, setSteps] = useState(false);
  const [platform, setPlatform] = useState<InstallPlatform>("desktop");
  const [prompt, setPrompt] = useState<InstallEvent | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (isStandalone(window as unknown as Parameters<typeof isStandalone>[0])) return;
    let dismissed: string | null = null;
    try {
      dismissed = localStorage.getItem(KEY);
    } catch {
      dismissed = null;
    }
    if (!shouldOffer(dismissed)) return;
    const p = platformOf(navigator.userAgent, navigator.maxTouchPoints);
    if (p === "desktop") return;
    setPlatform(p);
    setShow(true);
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setPrompt(e as InstallEvent);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    const onInstalled = () => setShow(false);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (!show) return null;
  const close = () => {
    setShow(false);
    try {
      localStorage.setItem(KEY, new Date().toISOString());
    } catch {
      /* sem espaço: tudo bem */
    }
  };

  return (
    <>
      <section className="install-banner">
        <span className="install-icon">
          <img src="/icon-192.png" alt="" width={44} height={44} />
        </span>
        <div className="install-copy">
          <h2>Deixe a nommi na sua tela de início</h2>
          <p>Vira um ícone no celular e abre sem a barra do navegador.</p>
        </div>
        <div className="install-actions">
          <Button
            size="sm"
            onClick={async () => {
              if (prompt) {
                await prompt.prompt();
                const { outcome } = await prompt.userChoice;
                if (outcome === "accepted") setShow(false);
                else close();
                return;
              }
              setSteps(true);
            }}
          >
            <Icon name="plus" />
            Adicionar
          </Button>
          <Button size="sm" variant="ghost" onClick={close} aria-label="Agora não">
            Agora não
          </Button>
        </div>
      </section>
      {steps && (
        <Sheet title="Como adicionar à tela de início" onClose={() => setSteps(false)}>
          <ol className="install-steps">
            {installSteps(platform).map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ol>
          <p className="small-note">
            Enquanto a nommi é um site, este é o jeito de ter o ícone no celular. O app nas lojas
            vem depois.
          </p>
          <Button
            className="wide"
            onClick={() => {
              setSteps(false);
              close();
            }}
          >
            Entendi
          </Button>
        </Sheet>
      )}
    </>
  );
}
