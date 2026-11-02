import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  AVISO_DO_VIDEO,
  MAIOR_LADO,
  QUALIDADE,
  ehFoto,
  ehVideo,
  medidasReduzidas,
  nomeDaFoto,
  tipoParaSubir,
  videoPodeNaoTocar,
} from "@/lib/foto-do-post";

describe("o que é foto e o que é vídeo", () => {
  it("vai pelo começo do tipo, não por lista de formato", () => {
    // Lista de formato foi o bug: HEIC não estava nela.
    expect(ehFoto("image/heic")).toBe(true);
    expect(ehFoto("image/qualquercoisanova")).toBe(true);
    expect(ehVideo("video/quicktime")).toBe(true);
    expect(ehFoto("application/pdf")).toBe(false);
    expect(ehVideo("application/pdf")).toBe(false);
  });
});

describe("reduzir a foto", () => {
  it("encolhe o maior lado e mantém a proporção", () => {
    const { largura, altura } = medidasReduzidas(4000, 3000);
    expect(largura).toBe(MAIOR_LADO);
    expect(altura).toBe(Math.round((MAIOR_LADO * 3000) / 4000));
  });
  it("vale para foto em pé também", () => {
    const { largura, altura } = medidasReduzidas(3000, 4000);
    expect(altura).toBe(MAIOR_LADO);
    expect(largura).toBeLessThan(altura);
  });
  it("nunca aumenta foto pequena", () => {
    // Esticar foto de 300px deixaria o arquivo maior e a imagem pior.
    expect(medidasReduzidas(300, 200)).toEqual({ largura: 300, altura: 200 });
  });
  it("nunca devolve zero", () => {
    const { largura, altura } = medidasReduzidas(1, 1);
    expect(largura).toBeGreaterThan(0);
    expect(altura).toBeGreaterThan(0);
  });
  it("o maior lado cobre tela de celular com folga para zoom", () => {
    expect(MAIOR_LADO).toBeGreaterThanOrEqual(1200);
    expect(MAIOR_LADO).toBeLessThanOrEqual(2400);
  });
  it("a qualidade não vira foto quadriculada nem arquivo gigante", () => {
    expect(QUALIDADE).toBeGreaterThanOrEqual(0.7);
    expect(QUALIDADE).toBeLessThanOrEqual(0.9);
  });
  it("o nome sai sempre .jpg, porque o arquivo sai sempre JPEG", () => {
    expect(nomeDaFoto("IMG_4312.HEIC")).toBe("IMG_4312.jpg");
    expect(nomeDaFoto("foto.png")).toBe("foto.jpg");
    expect(nomeDaFoto("")).toBe("foto.jpg");
  });
});

describe("com que tipo o arquivo sobe", () => {
  it("foto é sempre JPEG: passou pelo canvas", () => {
    for (const t of ["image/heic", "image/png", "image/webp"])
      expect(tipoParaSubir(t), t).toBe("image/jpeg");
  });
  it("o .mov do iPhone sobe anunciado como mp4", () => {
    // É o mesmo recipiente. Anunciado como video/quicktime o Chrome do
    // Android recusa de cara; como video/mp4 ele toca o conteúdo.
    expect(tipoParaSubir("video/quicktime")).toBe("video/mp4");
  });
  it("WebM continua WebM", () => {
    expect(tipoParaSubir("video/webm")).toBe("video/webm");
  });
});

describe("o aviso do vídeo", () => {
  it("avisa só no formato que pode não tocar", () => {
    expect(videoPodeNaoTocar("video/quicktime")).toBe(true);
    expect(videoPodeNaoTocar("video/mp4")).toBe(false);
    expect(videoPodeNaoTocar("video/webm")).toBe(false);
    expect(videoPodeNaoTocar("image/heic")).toBe(false);
  });
  it("é aviso, não proibição: diz que dá para publicar", () => {
    // Recusar deixaria quem tem iPhone sem postar vídeo nenhum.
    expect(AVISO_DO_VIDEO).toMatch(/dá para publicar|pode publicar/i);
  });
  it("não culpa a pessoa nem mostra o nome técnico do formato", () => {
    expect(/quicktime|mov\b|codec|hevc|mime/i.test(AVISO_DO_VIDEO)).toBe(false);
  });
});

describe("o compositor deixa o celular escolher", () => {
  const feed = readFileSync("src/components/friends/social-feed.tsx", "utf8");
  it("o accept não lista formato", () => {
    // Esta era a trava de verdade no iPhone: com accept listando jpeg/png, a
    // galeria apaga tudo o que não é daqueles tipos e a pessoa nem chega na
    // conferência. Corrigir só o mediaProblem não teria resolvido nada.
    const accepts = [...feed.matchAll(/accept="([^"]*)"/g)].map((m) => m[1]!);
    expect(accepts.length).toBeGreaterThan(0);
    for (const a of accepts) {
      if (!a.includes("image") && !a.includes("video")) continue;
      expect(a, "accept listando formato: " + a).not.toMatch(/jpeg|jpg|png|webp|mp4|webm/i);
    }
  });
});
