import { describe, expect, it } from "vitest";
import {
  cleanMessage,
  previewOf,
  hourOf,
  dayLabel,
  toMessage,
  toConversa,
  MAX_MESSAGE,
} from "@/lib/direct-messages";

describe("conversa a sós", () => {
  it("aceita de 1 a 1000 letras e tira espaço das pontas", () => {
    expect(cleanMessage("  oi  ")).toBe("oi");
    expect(cleanMessage("   ")).toBeNull();
    expect(cleanMessage("a".repeat(MAX_MESSAGE))).toHaveLength(1000);
    expect(cleanMessage("a".repeat(1001))).toBeNull();
  });
  it("resume a conversa na lista", () => {
    expect(previewOf({ ultima: "Bora sábado?", ultimaSticker: null, ultimaMinha: false })).toBe(
      "Bora sábado?",
    );
    expect(previewOf({ ultima: "Bora sábado?", ultimaSticker: null, ultimaMinha: true })).toBe(
      "Você: Bora sábado?",
    );
    expect(previewOf({ ultima: null, ultimaSticker: 7, ultimaMinha: false })).toBe("Figurinha");
    expect(previewOf({ ultima: null, ultimaSticker: null, ultimaMinha: null })).toBe(
      "Diga oi para começar.",
    );
  });
  it("marca a mensagem como minha pelo remetente", () => {
    const r = {
      id: "1",
      sender_id: "a",
      recipient_id: "b",
      body: "oi",
      sticker: null,
      created_at: "2026-10-21T12:00:00Z",
      read_at: null,
    };
    expect(toMessage(r, "a").mine).toBe(true);
    expect(toMessage(r, "b").mine).toBe(false);
  });
  it("separa os dias da conversa", () => {
    const hoje = new Date("2026-10-21T15:00:00Z");
    expect(dayLabel("2026-10-21T09:00:00Z", hoje)).toBe("Hoje");
    expect(dayLabel("2026-10-20T09:00:00Z", hoje)).toBe("Ontem");
    expect(dayLabel("2026-10-02T09:00:00Z", hoje)).toMatch(/outubro/);
  });
  it("mostra a hora da mensagem", () => {
    expect(hourOf("2026-10-21T12:34:00Z")).toMatch(/\d{2}:\d{2}/);
  });
  it("usa reserva quando a pessoa não tem apelido ou foto", () => {
    const c = toConversa({
      outro_id: "x",
      nickname: "",
      avatar_url: "",
      ultima: null,
      ultima_sticker: null,
      ultima_minha: null,
      ultima_em: null,
      nao_lidas: 0,
    });
    expect(c.nickname).toBe("nommi");
    expect(c.avatar).toBe("");
    expect(c.naoLidas).toBe(0);
  });
});
