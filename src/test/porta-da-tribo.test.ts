import { describe, expect, it } from "vitest";
import { portaDaTribo, recadoDaPorta } from "@/lib/porta-da-tribo";

const caso = (o: Partial<Parameters<typeof portaDaTribo>[0]>) =>
  portaDaTribo({
    souMembro: false,
    souCriadora: false,
    entrada: "aberta",
    meuPedido: null,
    ...o,
  });

describe("porta da tribo", () => {
  it("quem já está dentro não vê botão", () => {
    expect(caso({ souMembro: true })).toBe("dentro");
    expect(caso({ souCriadora: true, entrada: "fechada" })).toBe("dentro");
  });
  it("tribo aberta: entra na hora", () => {
    expect(caso({})).toBe("entrar");
  });
  it("tribo fechada: pede para entrar", () => {
    expect(caso({ entrada: "fechada" })).toBe("pedir");
  });
  it("pedido pendente vira espera, não botão de pedir de novo", () => {
    expect(caso({ entrada: "fechada", meuPedido: "pendente" })).toBe("esperando");
  });
  it("recusado não volta a oferecer o pedido", () => {
    expect(caso({ entrada: "fechada", meuPedido: "recusado" })).toBe("recusado");
  });
  it("pedido aceito que ainda não virou participação cai em pedir, nunca em erro", () => {
    expect(caso({ entrada: "fechada", meuPedido: "aceito" })).toBe("pedir");
  });
  it("a recusa é dita sem humilhar ninguém", () => {
    const texto = recadoDaPorta("recusado");
    expect(texto).toMatch(/outra tribo/);
    expect(texto).not.toMatch(/negad|rejeit/i);
  });
  it("quem está dentro não recebe recado nenhum", () => {
    expect(recadoDaPorta("dentro")).toBe("");
  });
});
