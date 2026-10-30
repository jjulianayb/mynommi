import { describe, expect, it } from "vitest";
import {
  caminhoDaFotoDePerfil,
  ehFotoEmArquivo,
  jpegParaBlob,
  recadoDaFoto,
} from "@/lib/foto-perfil";
import { enderecoDaImagem } from "@/lib/covers";

describe("onde a foto de perfil é guardada", () => {
  it("o caminho começa pela pasta da própria pessoa: é o que a regra do banco exige", () => {
    const id = "aea5404f-a582-4f92-8244-cf5204a06f03";
    expect(caminhoDaFotoDePerfil(id, 1)).toBe(`${id}/foto-1.jpg`);
  });
  it("cada envio tem nome novo, senão o celular mostra a foto velha do cache", () => {
    const id = "aea5404f-a582-4f92-8244-cf5204a06f03";
    expect(caminhoDaFotoDePerfil(id, 1)).not.toBe(caminhoDaFotoDePerfil(id, 2));
  });
  it("id com coisa estranha não vira caminho para fora da pasta", () => {
    expect(caminhoDaFotoDePerfil("../../outro/pasta", 1)).toBe("outropasta/foto-1.jpg");
    expect(caminhoDaFotoDePerfil("", 1)).toBe("");
  });
});

describe("as fotos antigas continuam funcionando", () => {
  it("foto embutida é reconhecida como antiga", () => {
    expect(ehFotoEmArquivo("data:image/jpeg;base64,AAAA")).toBe(false);
  });
  it("arquivo no armazenamento é reconhecido", () => {
    expect(ehFotoEmArquivo("abc-123/foto-9.jpg")).toBe(true);
  });
  it("vazio não é nem um nem outro", () => {
    expect(ehFotoEmArquivo("")).toBe(false);
  });
  it("a tela mostra as duas formas sem mudar nada", () => {
    const embutida = "data:image/jpeg;base64,AAAA";
    expect(enderecoDaImagem(embutida)).toBe(embutida);
    expect(enderecoDaImagem("abc-123/foto-9.jpg")).toContain("abc-123/foto-9.jpg");
  });
});

describe("o recorte vira arquivo", () => {
  it("um JPEG embutido vira blob de imagem", () => {
    // 1x1 JPEG mínimo, em base64.
    const mini =
      "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/wAALCAABAAEBAREA/8QAFAABAAAAAAAAAAAAAAAAAAAACf/EABQQAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEAAD8AKp//2Q==";
    const b = jpegParaBlob(mini);
    expect(b).not.toBe(null);
    expect(b!.type).toBe("image/jpeg");
    expect(b!.size).toBeGreaterThan(0);
  });
  it("texto que não é imagem não vira arquivo", () => {
    expect(jpegParaBlob("javascript:alert(1)")).toBe(null);
    expect(jpegParaBlob("data:text/html,<script>")).toBe(null);
    expect(jpegParaBlob("")).toBe(null);
  });
});

describe("o que a pessoa lê", () => {
  it("falha de envio explica o que fazer, sem jargão", () => {
    const r = recadoDaFoto("sem_rede");
    expect(r).toContain("trocar foto");
    expect(/erro \d|upload|storage|null/i.test(r)).toBe(false);
  });
});
