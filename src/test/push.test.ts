import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  PRAZO_DO_SW_MS,
  marcaDoAviso,
  passoDoAviso,
  pushSuportado,
  type EstadoAvisos,
} from "@/lib/push";

/**
 * O bug (06/11): **42 contas e zero avisos ligados.**
 *
 * A marca de "já falei disso" era gravada antes de decidir o que mostrar.
 * Como ninguém chega com o app já na tela inicial, a primeira visita caía
 * sempre no ramo "instala primeiro" e **queimava a marca**. Quando a pessoa
 * instalava depois, o efeito saía na primeira linha e a oferta de ligar nunca
 * mais aparecia. O recurso existia, estava publicado, e era inalcançável.
 */
describe("qual passo o Pippo dá", () => {
  it("instalado e ainda sem avisos: oferece ligar", () => {
    expect(passoDoAviso(true, "disponivel")).toBe("oferecer");
  });
  it("não instalado: ensina a instalar, porque no iPhone não há outro jeito", () => {
    for (const e of ["disponivel", "sem-suporte", "negado"] as EstadoAvisos[])
      expect(passoDoAviso(false, e), e).toBe("ensinar-instalar");
  });
  it("já ligado, já negado ou sem suporte: não fala nada", () => {
    expect(passoDoAviso(true, "ativo")).toBe("nada");
    expect(passoDoAviso(true, "negado")).toBe("nada");
    expect(passoDoAviso(true, "sem-suporte")).toBe("nada");
  });
});

describe("a marca é por caminho, não uma só", () => {
  it("ensinar a instalar não gasta a marca de oferecer", () => {
    // Esta é a regressão. Se as duas voltarem a ser a mesma chave, quem foi
    // ensinada a instalar nunca mais recebe a oferta.
    const ensinar = marcaDoAviso("ensinar-instalar", "u1");
    const oferecer = marcaDoAviso("oferecer", "u1");
    expect(ensinar).toBeTruthy();
    expect(oferecer).toBeTruthy();
    expect(ensinar).not.toBe(oferecer);
  });
  it("a marca é por pessoa: duas contas no mesmo aparelho não se atrapalham", () => {
    expect(marcaDoAviso("oferecer", "u1")).not.toBe(marcaDoAviso("oferecer", "u2"));
  });
  it("sem passo não há marca a gastar", () => {
    expect(marcaDoAviso("nada", "u1")).toBeNull();
  });
  it("o caminho completo de quem chega: ensina, instala, e aí recebe a oferta", () => {
    const gravadas = new Set<string>();
    const passa = (instalado: boolean, estado: EstadoAvisos) => {
      const passo = passoDoAviso(instalado, estado);
      const marca = marcaDoAviso(passo, "u1");
      if (!marca || gravadas.has(marca)) return "nada";
      gravadas.add(marca);
      return passo;
    };
    expect(passa(false, "sem-suporte")).toBe("ensinar-instalar"); // primeira visita
    expect(passa(false, "sem-suporte")).toBe("nada"); // não repete a lição
    expect(passa(true, "disponivel")).toBe("oferecer"); // instalou: a oferta vem
    expect(passa(true, "ativo")).toBe("nada"); // ligou: assunto encerrado
  });
});

describe("o aparelho precisa das três peças", () => {
  it("falta qualquer uma e não há aviso", () => {
    const nav = { serviceWorker: {} } as unknown as Navigator;
    expect(pushSuportado(nav, { PushManager: 1, Notification: 1 } as unknown as Window)).toBe(true);
    expect(pushSuportado({} as Navigator, { PushManager: 1, Notification: 1 } as unknown as Window)).toBe(
      false,
    );
    expect(pushSuportado(nav, { Notification: 1 } as unknown as Window)).toBe(false);
    expect(pushSuportado(nav, { PushManager: 1 } as unknown as Window)).toBe(false);
  });
});

describe("ligar os avisos não pode travar calado", () => {
  it("há prazo para o service worker ficar pronto", () => {
    // `navigator.serviceWorker.ready` nunca rejeita: se o registro falhou, ela
    // simplesmente não resolve. Sem prazo, o toque fica esperando para sempre
    // e o catch nunca dispara, porque nada foi lançado.
    expect(PRAZO_DO_SW_MS).toBeGreaterThan(2000);
    expect(PRAZO_DO_SW_MS).toBeLessThanOrEqual(15000);
  });
  it("a espera é uma corrida contra o prazo, não um await solto", () => {
    const fonte = readFileSync("src/lib/push.ts", "utf8");
    expect(fonte).toContain("Promise.race");
    expect(/await navigator\.serviceWorker\.ready/.test(fonte)).toBe(false);
  });
});

describe("dá para ligar fora do balão do Pippo", () => {
  it("as Configurações têm o botão", () => {
    // Recurso que depende de um balão aparecer na hora certa é recurso que
    // não existe. Configurações é onde as pessoas procuram notificação.
    const cfg = readFileSync("src/components/friends/settings.tsx", "utf8");
    expect(cfg).toContain("ativarAvisos");
    expect(cfg).toContain("AvisosNoCelular");
  });
  it("o botão lê o estado do aparelho, não um valor gravado", () => {
    const cfg = readFileSync("src/components/friends/settings.tsx", "utf8");
    expect(cfg).toContain("estadoDosAvisos()");
  });
});
