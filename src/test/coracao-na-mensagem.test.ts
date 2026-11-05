import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { DOIS_TOQUES_MS, ehDoisToques, recadoDoCoracao, rotuloDeCoracoes } from "@/lib/coracao-na-mensagem";
import { toMessage } from "@/lib/shared-teias";

/**
 * Por que o curtir existe (pedido da Ju, 04/11): a Tribo do Pippo tinha
 * **41 pessoas e zero mensagens**. Escrever numa sala com quarenta pessoas é
 * exposição; tocar num coração não é. É a participação de menor atrito que
 * existe, e é o que faz quem arriscou a primeira mensagem não levar silêncio.
 */
describe("o toque duplo", () => {
  it("dois toques juntos valem", () => {
    const t = 1_000_000;
    expect(ehDoisToques(t, t + 100)).toBe(true);
  });
  it("dois toques separados não valem", () => {
    const t = 1_000_000;
    expect(ehDoisToques(t, t + DOIS_TOQUES_MS + 1)).toBe(false);
  });
  it("o primeiro toque da vida nunca é duplo", () => {
    expect(ehDoisToques(null, Date.now())).toBe(false);
  });
  it("a janela é a do sistema, não um número qualquer", () => {
    // Curta demais exige precisão que ninguém tem com o dedo; longa demais
    // junta dois toques em mensagens diferentes num só.
    expect(DOIS_TOQUES_MS).toBeGreaterThanOrEqual(250);
    expect(DOIS_TOQUES_MS).toBeLessThanOrEqual(500);
  });
});

describe("o que aparece ao lado da mensagem", () => {
  it("zero não mostra número", () => {
    // "0" ao lado de cada mensagem numa tribo quieta é placar de fracasso, e
    // é justamente a sala que a gente está tentando destravar.
    expect(rotuloDeCoracoes(0)).toBe("");
  });
  it("a partir de um, mostra o número real", () => {
    expect(rotuloDeCoracoes(1)).toBe("1");
    expect(rotuloDeCoracoes(12)).toBe("12");
  });
  it("nunca arredonda para k", () => {
    expect(rotuloDeCoracoes(12000)).toBe("12000");
    expect(rotuloDeCoracoes(12000)).not.toContain("k");
  });
});

describe("o que o leitor de tela ouve", () => {
  it("sem coração, é um convite", () => {
    expect(recadoDoCoracao(false, 0)).toMatch(/curtir/i);
  });
  it("com o meu, diz que foi meu", () => {
    expect(recadoDoCoracao(true, 1)).toMatch(/você/i);
    expect(recadoDoCoracao(true, 3)).toMatch(/você e mais 2/i);
  });
  it("sem o meu, conta quantas pessoas", () => {
    expect(recadoDoCoracao(false, 1)).toMatch(/1 pessoa/);
    expect(recadoDoCoracao(false, 4)).toMatch(/4 pessoas/);
  });
});

describe("a mensagem que vem do banco", () => {
  const linha = {
    id: "m1",
    teia_key: "100024",
    sender_id: "outra",
    author: "Beatriz",
    body: "oi gente",
    sticker: null,
    created_at: "2026-11-04T12:00:00Z",
  };

  it("conta os corações e sabe se o meu está lá", () => {
    const m = toMessage({ ...linha, reacoes_de_mensagem: [{ user_id: "eu" }, { user_id: "x" }] }, "eu");
    expect(m.coracoes).toBe(2);
    expect(m.euCurti).toBe(true);
  });
  it("sem o meu, euCurti é falso", () => {
    const m = toMessage({ ...linha, reacoes_de_mensagem: [{ user_id: "x" }] }, "eu");
    expect(m.coracoes).toBe(1);
    expect(m.euCurti).toBe(false);
  });
  it("mensagem sem reação nenhuma não quebra", () => {
    const m = toMessage(linha, "eu");
    expect(m.coracoes).toBe(0);
    expect(m.euCurti).toBe(false);
  });
  it("leva o id, senão não há o que curtir", () => {
    expect(toMessage(linha, "eu").id).toBe("m1");
  });

  /**
   * O bug que isto fecha: a bolha de quem não era você mostrava
   * `<Avatar id={7} />` — uma pessoa do conjunto da apresentação. Numa tribo
   * com quarenta pessoas, todas apareciam com o mesmo rosto de uma
   * desconhecida, o Pippo incluído. Mesmo bug que o Felipe viu no perfil dele
   * em 26/10, aqui dentro do chat.
   */
  it("leva a foto de quem escreveu", () => {
    const m = toMessage(linha, "eu", { outra: "https://x/foto.jpg" });
    expect(m.authorAvatar).toBe("https://x/foto.jpg");
    expect(m.senderId).toBe("outra");
  });
  it("sem foto não herda a de outra pessoa", () => {
    const m = toMessage(linha, "eu", {});
    expect(m.authorAvatar).toBeUndefined();
    // senderId presente é o sinal de conta real: a tela desenha a inicial,
    // nunca um rosto do conjunto da apresentação.
    expect(m.senderId).toBe("outra");
  });
});

describe("a tela", () => {
  const app = readFileSync("src/components/friends/app.tsx", "utf8");
  /**
   * O editor do Lovable reformata o styles.css a cada save (prettier dele), e o
   * formato que sobra no repositório não é mais o minificado original. O que
   * estes testes protegem é a regra (seletor, propriedade, valor, ordem), não a
   * diagramação: leia o CSS já normalizado para a asserção não depender de
   * espaço, quebra de linha ou ponto e vírgula final.
   */
  function lerCss(caminho = "src/styles.css"): string {
    return readFileSync(caminho, "utf8")
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/\s+/g, " ")
      .replace(/\s*\{\s*/g, "{")
      .replace(/\s*\}\s*/g, "}")
      .replace(/:\s+/g, ":")
      .replace(/,\s+/g, ",")
      .replace(/\s*>\s*/g, ">")
      .replace(/;\s*/g, ";")
      .replace(/;}/g, "}")
      .replace(/}/g, "}\n");
  }

  const css = lerCss();

  it("não desenha mais o mesmo rosto para todo mundo na tribo", () => {
    // Avatar id={7} só pode sobrar no caminho da apresentação, que é onde o
    // conjunto de rostos é de propósito. Comentário não conta: este próprio
    // arquivo explica o bug citando o código antigo, e isso pegaria o teste.
    const semComentario = app.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*/g, "");
    expect((semComentario.match(/Avatar id=\{7\}/g) ?? []).length).toBe(1);
  });
  it("usa um ícone que existe", () => {
    const art = readFileSync("src/components/friends/art.tsx", "utf8");
    for (const nome of app.match(/<Icon name="([a-z-]+)"/g) ?? []) {
      const n = nome.replace(/.*name="/, "").replace('"', "");
      // Nome que não existe cai no `star` sem avisar — foi por isso que o
      // heart-filled não entrou.
      expect(art.includes(n + ":"), "ícone inexistente: " + n).toBe(true);
    }
  });
  it("o coração tem área de toque de 44 px", () => {
    // A regra da casa é sobre o dedo, não sobre o desenho.
    const regra = css.match(/\.msg-coracao::after\{[^}]*\}/)?.[0] ?? "";
    expect(regra).toContain("44px");
  });
  it("o coração é cor da marca, nunca o coral de alerta", () => {
    const regras = css.match(/\.msg-coracao[^{]*\{[^}]*\}/g) ?? [];
    expect(regras.length).toBeGreaterThan(0);
    for (const r of regras) {
      expect(/--coral/.test(r), r).toBe(false);
      expect(/#[0-9a-f]{3,8}/i.test(r), "cor na mão: " + r).toBe(false);
    }
  });
  it("a animação respeita quem pediu menos movimento", () => {
    expect(css).toMatch(/prefers-reduced-motion[\s\S]*msg-coracao/);
  });
});
