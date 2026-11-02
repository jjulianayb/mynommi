import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  marcarTourVisto,
  passosVisiveis,
  posicaoDoBalao,
  recorte,
  PASSOS_DO_TOUR,
  type Caixa,
  type Posicao,
} from "@/lib/tour";
import { Icon } from "./art";
import { apontaPippo } from "./pippo";
import "./pippo.css";

const medir = (el: Element): Caixa => {
  const r = el.getBoundingClientRect();
  return { top: r.top, left: r.left, width: r.width, height: r.height };
};

const LARGURA_MAO = 128;
const ALTURA_MAO = 112;
// No desenho, o dedo aponta para cima e um pouco para a direita (15 graus).
const DEDO = 15;

/**
 * Onde fica o Pippo e quanto ele gira para o dedo apontar o alvo. Ele aparece
 * colado ao balão, do lado do alvo, e gira para o dedo cair em cima do que
 * a pessoa precisa tocar.
 */
export function posicaoDaMao(alvo: Caixa, pos: Posicao, balao: HTMLElement | null) {
  const bl = balao?.offsetWidth ?? 300;
  const ba = balao?.offsetHeight ?? 160;
  const cx = alvo.left + alvo.width / 2;
  const cy = alvo.top + alvo.height / 2;
  const left = Math.min(
    Math.max(pos.left + 4, cx - LARGURA_MAO / 2),
    pos.left + bl - LARGURA_MAO - 4,
  );
  const top = pos.lado === "abaixo" ? pos.top - ALTURA_MAO + 22 : pos.top + ba - 22;
  const mx = left + LARGURA_MAO / 2;
  const my = top + ALTURA_MAO / 2;
  const dx = cx - mx;
  const dy = cy - my;
  const espelha = dx < 0;
  const graus = (Math.atan2(dy, Math.abs(dx)) * 180) / Math.PI;
  // direção natural do dedo, medida a partir do eixo x (para cima = -90)
  const natural = -90 + DEDO;
  let giro = graus - natural;
  giro = Math.max(-110, Math.min(110, giro));
  const transform = espelha ? `scaleX(-1) rotate(${giro}deg)` : `rotate(${giro}deg)`;
  return { top: Math.max(4, top), left: Math.max(4, left), transform };
}

/** O tour guiado: um balão por vez, apontando para a tela de verdade. */
export function Tour({ me, onFim }: { me: string; onFim: () => void }) {
  const [passos] = useState(() =>
    passosVisiveis(PASSOS_DO_TOUR, (alvo) => !!document.querySelector(alvo)),
  );
  const [i, setI] = useState(0);
  const [alvo, setAlvo] = useState<Caixa | null>(null);
  const [pos, setPos] = useState<Posicao | null>(null);
  const balaoRef = useRef<HTMLDivElement>(null);
  const passo = passos[i];

  const fechar = useCallback(() => {
    marcarTourVisto(me);
    onFim();
  }, [me, onFim]);

  const recalcular = useCallback(() => {
    if (!passo) return;
    const el = document.querySelector(passo.alvo);
    if (!el) {
      setAlvo(null);
      return;
    }
    const caixa = medir(el);
    setAlvo(caixa);
    const b = balaoRef.current;
    setPos(
      posicaoDoBalao(
        caixa,
        { largura: window.innerWidth, altura: window.innerHeight },
        { largura: b?.offsetWidth ?? 300, altura: b?.offsetHeight ?? 160 },
        passo.preferido,
      ),
    );
  }, [passo]);

  useEffect(() => {
    if (!passo) return;
    const el = document.querySelector(passo.alvo);
    el?.scrollIntoView({ block: "center", behavior: "smooth" });
    const t = setTimeout(recalcular, 320);
    window.addEventListener("resize", recalcular);
    window.addEventListener("scroll", recalcular, true);
    return () => {
      clearTimeout(t);
      window.removeEventListener("resize", recalcular);
      window.removeEventListener("scroll", recalcular, true);
    };
  }, [passo, recalcular]);

  useEffect(() => {
    const sair = (e: KeyboardEvent) => {
      if (e.key === "Escape") fechar();
    };
    document.addEventListener("keydown", sair);
    return () => document.removeEventListener("keydown", sair);
  }, [fechar]);

  if (!passo) return null;
  const ultimo = i === passos.length - 1;
  const mao = alvo && pos ? posicaoDaMao(alvo, pos, balaoRef.current) : null;
  const furo = alvo ? recorte(alvo) : null;

  return (
    <div className="tour" role="dialog" aria-modal="true" aria-label="Tour pela nommi">
      <button type="button" className="tour-fundo" aria-label="Fechar o tour" onClick={fechar} />
      {furo && (
        <span
          className="tour-holofote"
          aria-hidden="true"
          style={{ top: furo.top, left: furo.left, width: furo.width, height: furo.height }}
        />
      )}
      {mao && (
        <img
          className="tour-mao"
          src={apontaPippo}
          alt=""
          style={{ top: mao.top, left: mao.left, transform: mao.transform }}
        />
      )}
      <div
        className="tour-balao"
        ref={balaoRef}
        style={pos ? { top: pos.top, left: pos.left } : { bottom: 24, left: 16, right: 16 }}
      >
        <p className="tour-conta">
          Passo {i + 1} de {passos.length}
        </p>
        <h2>{passo.titulo}</h2>
        <p className="tour-texto">{passo.texto}</p>
        <div className="tour-acoes">
          <Button type="button" variant="ghost" onClick={fechar}>
            Pular
          </Button>
          <div className="tour-pontos" aria-hidden="true">
            {passos.map((p, n) => (
              <span key={p.id} className={n === i ? "agora" : ""} />
            ))}
          </div>
          <Button
            type="button"
            onClick={() => {
              if (ultimo) fechar();
              else setI((n) => n + 1);
            }}
          >
            {ultimo ? "Entendi" : "Próximo"}
            {!ultimo && <Icon name="arrow" />}
          </Button>
        </div>
      </div>
    </div>
  );
}
