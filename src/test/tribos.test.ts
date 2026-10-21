import { describe, expect, it } from "vitest";
import { demoState, emptyState } from "@/lib/friends-data";
import { joinTeia, leaveTeia, isMember, openTeias, WELCOME_TEXT } from "@/lib/tribos";
import { chatStickers } from "@/lib/sticker-catalogue";

describe("Tribos abertas", () => {
  it('são 4 tribos abertas e a de desabafo é moderada com a regra "Aqui a gente escuta"', () => {
    expect(openTeias).toHaveLength(4);
    const d = openTeias.find((t) => t.name === "Desabafo sem julgamento");
    expect(d?.moderated).toBe(true);
    expect(d?.rule).toBe("Aqui a gente escuta");
  });
  it("conta nova não vem com nenhuma tribo; demonstração mantém as 3 atuais", () => {
    expect(emptyState.joinedTeias).toEqual([]);
    expect(demoState.joinedTeias).toEqual([0, 1, 2]);
  });
  it("entrar é imediato e traz a mensagem de boas-vindas uma única vez", () => {
    const once = joinTeia(emptyState, 3);
    expect(isMember(once, 3)).toBe(true);
    expect(once.groupMessages["3"]?.at(-1)?.text).toBe(WELCOME_TEXT);
    const again = joinTeia(leaveTeia(once, 3), 3);
    expect(again.groupMessages["3"]?.filter((m) => m.text === WELCOME_TEXT)).toHaveLength(1);
  });
  it("sair da tribo remove só ela", () => {
    expect(leaveTeia(demoState, 1).joinedTeias).toEqual([0, 2]);
  });
});
describe("Figurinhas neutras", () => {
  it("usam as novas legendas", () => {
    expect([1, 3, 17, 23].map((i) => chatStickers[i]?.caption)).toEqual([
      "da hora demais",
      "estrela do karaokê",
      "mandou bem",
      "a gente junto",
    ]);
  });
});
