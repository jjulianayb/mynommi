import { describe, expect, it } from "vitest";
import {
  RECADO_DO_NAVEGADOR,
  ehNavegadorDeApp,
  podeEntrarComGoogle,
  recadoDoLoginSocial,
} from "@/lib/navegador";
import { enderecoCanonico } from "@/lib/endereco";

const UA = {
  whatsappAndroid:
    "Mozilla/5.0 (Linux; Android 13; SM-A themes) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Mobile Safari/537.36 WhatsApp/2.24",
  whatsappIphone:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148",
  instagram:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Instagram 302.0",
  facebook:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 [FBAN/FBIOS;FBAV/450]",
  safariIphone:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
  chromeAndroid:
    "Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Mobile Safari/537.36",
  chromeIphone:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 CriOS/120 Mobile/15E148 Safari/604.1",
};

describe("reconhecer a janelinha de outro app", () => {
  it("pega WhatsApp, Instagram e Facebook", () => {
    expect(ehNavegadorDeApp(UA.whatsappAndroid)).toBe(true);
    expect(ehNavegadorDeApp(UA.whatsappIphone)).toBe(true);
    expect(ehNavegadorDeApp(UA.instagram)).toBe(true);
    expect(ehNavegadorDeApp(UA.facebook)).toBe(true);
  });
  it("não confunde navegador de verdade com janelinha", () => {
    expect(ehNavegadorDeApp(UA.safariIphone)).toBe(false);
    expect(ehNavegadorDeApp(UA.chromeAndroid)).toBe(false);
    expect(ehNavegadorDeApp(UA.chromeIphone)).toBe(false);
  });
  it("sem informação nenhuma, não acusa: na dúvida deixa entrar", () => {
    expect(ehNavegadorDeApp("")).toBe(false);
  });
  it("o Google só é oferecido onde funciona", () => {
    expect(podeEntrarComGoogle(UA.safariIphone)).toBe(true);
    expect(podeEntrarComGoogle(UA.whatsappIphone)).toBe(false);
  });
});

describe("o que a pessoa lê", () => {
  it("o aviso ensina a sair da janelinha e oferece o caminho que funciona", () => {
    expect(RECADO_DO_NAVEGADOR).toContain("abrir no navegador");
    expect(RECADO_DO_NAVEGADOR).toContain("e-mail");
  });
  it("erro de login nunca mostra código técnico", () => {
    for (const r of [recadoDoLoginSocial(true), recadoDoLoginSocial(false)]) {
      expect(/invalid_request|state parameter|OAuth|erro \d/i.test(r)).toBe(false);
      expect(r).toContain("e-mail");
    }
  });
});

describe("um endereço só, para o login não perder a chave", () => {
  it("manda o www para o endereço sem www, mantendo o caminho", () => {
    expect(enderecoCanonico("https://www.nommibr.com.br/conta?modo=criar")).toBe(
      "https://nommibr.com.br/conta?modo=criar",
    );
  });
  it("quem já está no lugar certo não é mandado a lugar nenhum", () => {
    expect(enderecoCanonico("https://nommibr.com.br/")).toBe(null);
    expect(enderecoCanonico("https://nommibrasil.lovable.app/conta")).toBe(null);
  });
  it("não mexe em endereço de desenvolvimento", () => {
    expect(enderecoCanonico("http://localhost:8080/conta")).toBe(null);
    expect(enderecoCanonico("http://www.localhost/conta")).toBe(null);
  });
  it("endereço quebrado não quebra o app", () => {
    expect(enderecoCanonico("isso não é um endereço")).toBe(null);
  });
});
