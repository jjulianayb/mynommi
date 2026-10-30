import { beforeEach, describe, expect, it } from "vitest";
import {
  conviteGuardado,
  enderecoSemConvite,
  guardarConvite,
  lerConviteDaUrl,
  limparConvite,
  recadoDaChegada,
} from "@/lib/convite-que-chega";

beforeEach(() => limparConvite());

describe("ler o convite do link", () => {
  it("pega o código e a tribo", () => {
    const c = lerConviteDaUrl("?modo=criar&convite=ABC123&tribo=100018");
    expect(c?.codigo).toBe("ABC123");
    expect(c?.tribo).toBe(100018);
  });
  it("funciona com ou sem a interrogação", () => {
    expect(lerConviteDaUrl("convite=X")?.codigo).toBe("X");
  });
  it("link sem convite não inventa convite", () => {
    expect(lerConviteDaUrl("?modo=criar")).toBeNull();
    expect(lerConviteDaUrl("")).toBeNull();
    expect(lerConviteDaUrl("?convite=")).toBeNull();
  });
  it("tribo que não é número vira nada, nunca NaN", () => {
    // NaN viraria `teia_key: "NaN"` e a pessoa entraria numa tribo que não existe.
    expect(lerConviteDaUrl("?convite=X&tribo=abc")?.tribo).toBeNull();
    expect(lerConviteDaUrl("?convite=X&tribo=10;drop")?.tribo).toBeNull();
    expect(lerConviteDaUrl("?convite=X")?.tribo).toBeNull();
  });
  it("código gigante é cortado antes de ir para o banco", () => {
    expect(lerConviteDaUrl("?convite=" + "x".repeat(500))?.codigo).toHaveLength(40);
  });
});

describe("o convite atravessa o login", () => {
  // O login do Google e da Apple volta num endereço limpo. Se o código só
  // existisse na barra de endereço, ele se perdia no caminho mais usado.
  it("guarda e lê de volta", () => {
    guardarConvite({ codigo: "ABC", tribo: 7 });
    expect(conviteGuardado()).toEqual({ codigo: "ABC", tribo: 7 });
  });
  it("sem nada guardado, não devolve nada", () => {
    expect(conviteGuardado()).toBeNull();
  });
  it("lixo guardado não quebra a chegada de ninguém", () => {
    localStorage.setItem("nommi-convite", "{isso não é json");
    expect(conviteGuardado()).toBeNull();
  });
  it("sem código e sem tribo, não vale nada", () => {
    localStorage.setItem("nommi-convite", JSON.stringify({ codigo: "  ", tribo: null }));
    expect(conviteGuardado()).toBeNull();
  });
  it("só tribo, sem código, vale: é quem chegou pela página da tribo", () => {
    // A página pública da tribo manda só `?tribo=`, porque link de divulgação
    // é usado por muita gente e código de convite vale uma vez só.
    expect(lerConviteDaUrl("?tribo=100018")).toEqual({ codigo: "", tribo: 100018 });
    guardarConvite({ codigo: "", tribo: 100018 });
    expect(conviteGuardado()).toEqual({ codigo: "", tribo: 100018 });
  });
  it("limpar tira de verdade", () => {
    guardarConvite({ codigo: "ABC", tribo: null });
    limparConvite();
    expect(conviteGuardado()).toBeNull();
  });
});

describe("o código sai da barra de endereço", () => {
  it("tira convite e tribo e deixa o resto", () => {
    const e = enderecoSemConvite("https://nommibr.com.br/conta?modo=criar&convite=ABC&tribo=5");
    expect(e).toContain("modo=criar");
    expect(e).not.toContain("convite");
    expect(e).not.toContain("tribo");
  });
  it("endereço sem nada para tirar fica igual", () => {
    expect(enderecoSemConvite("https://nommibr.com.br/")).toContain("nommibr.com.br");
  });
});

describe("o recado de quem chegou por convite", () => {
  it("quem não usou convite nem entrou em tribo não recebe recado nenhum", () => {
    expect(recadoDaChegada({ usou: false, entrouNaTribo: false })).toBe("");
  });
  it("quem veio pela página da tribo é avisada de que já está dentro", () => {
    expect(recadoDaChegada({ usou: false, entrouNaTribo: true })).toContain("tribo");
  });
  it("diz o nome de quem convidou quando se sabe", () => {
    expect(recadoDaChegada({ usou: true, entrouNaTribo: false }, "Ju")).toContain("Ju");
  });
  it("avisa da tribo só quando entrou mesmo", () => {
    expect(recadoDaChegada({ usou: true, entrouNaTribo: true }, "Ju")).toContain("tribo");
    expect(recadoDaChegada({ usou: true, entrouNaTribo: false }, "Ju")).not.toContain("tribo");
  });
});
