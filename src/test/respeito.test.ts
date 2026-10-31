import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  ATAQUE_A_GRUPO,
  PALAVRAO,
  RECADO_BARRADO,
  REGRAS_DA_NOMMI,
  SO_COM_ALVO,
  XINGAMENTOS,
  conferirRespeito,
  normalizar,
  recadoDoBanco,
  vaiContraAlguem,
} from "@/lib/respeito";

const nivel = (t: string) => conferirRespeito(t).nivel;

describe("as regras da nommi", () => {
  it("existem, são curtas e falam de gente, não de jurídico", () => {
    expect(REGRAS_DA_NOMMI.length).toBeGreaterThanOrEqual(4);
    for (const r of REGRAS_DA_NOMMI) {
      expect(r.length).toBeLessThan(120);
      expect(/nos termos|cláusula|vedado|o usuário/i.test(r)).toBe(false);
    }
  });
  it("a primeira é sobre humilhação, que é o que a Ju pediu", () => {
    expect(REGRAS_DA_NOMMI[0]).toMatch(/humilhada|humilhação/i);
  });
});

describe("conversa normal passa", () => {
  // O teste que mais importa. Filtro que atrapalha conversa boa é desligado
  // na semana seguinte, e aí não sobra filtro nenhum.
  const normais = [
    "Oi meninas, alguém topa um café sábado?",
    "Que dia difícil, gente",
    "Você é demais, Ana!",
    "Sua ideia foi a melhor da tribo",
    "Vou levar a minha filha, tudo bem?",
    "Adorei te conhecer ontem",
    "Esse lugar é meio caro, mas vale",
    "Não vou poder ir, me desculpa",
    "Minha mãe tem uma vaca lá no sítio",
    "Ela é assassina de prazo, entrega tudo em cima da hora",
  ];
  it.each(normais)("passa: %s", (t) => expect(nivel(t)).toBe("ok"));
});

describe("xingamento contra uma pessoa é barrado", () => {
  it("barra quando vai endereçado", () => {
    expect(nivel("você é uma idiota")).toBe("barra");
    expect(nivel("vc eh burra mesmo")).toBe("barra");
    expect(nivel("sua vagabunda")).toBe("barra");
    expect(nivel("vai se foder, @ana")).toBe("barra");
  });
  it("pega o troca-letra mais comum", () => {
    expect(nivel("voce e uma 1diot4")).toBe("barra");
  });
  it("pega letra esticada", () => {
    expect(nivel("sua vadiiiiia")).toBe("barra");
  });
});

describe("quem conta o que sofreu não é barrada", () => {
  // A regra mais importante do arquivo. Barrar quem está desabafando seria
  // silenciar justamente quem mais precisa falar na tribo.
  const desabafos = [
    "Ela me chamou de vadia na frente de todo mundo",
    "O cara gritou idiota pra mim no trânsito",
    "Minha chefe disse que eu era burra na reunião",
  ];
  it.each(desabafos)("não barra: %s", (t) => expect(nivel(t)).not.toBe("barra"));
});

describe("ataque a um grupo não depende de ter alvo", () => {
  it("dizer na roda já é o ato", () => {
    for (const p of ["viado", "traveco", "mongoloide"]) {
      expect(nivel(`isso aqui tá cheio de ${p}`)).toBe("barra");
    }
  });
  it("mas palavra que também existe sem ser ofensa precisa de alvo", () => {
    // Barrar "vi uma macaca no zoológico" desmoralizaria a regra inteira, e aí
    // a Ju tiraria o filtro todo. Como ataque racial, essas palavras vêm
    // endereçadas, e é assim que elas caem.
    expect(nivel("vi uma macaca no zoológico")).toBe("ok");
    expect(nivel("você é uma macaca")).toBe("barra");
  });
});

describe("palavrão sem alvo avisa, não barra", () => {
  it("deixa a pessoa falar do jeito dela", () => {
    expect(nivel("que merda de dia")).toBe("avisa");
    expect(nivel("caralho que legal")).toBe("avisa");
  });
});

describe("o recado nunca repete o xingamento de volta", () => {
  it("não devolve a palavra na cara de quem escreveu", () => {
    const r = conferirRespeito("você é uma idiota").recado;
    for (const p of [...XINGAMENTOS, ...ATAQUE_A_GRUPO, ...PALAVRAO]) {
      expect(r.toLowerCase()).not.toContain(p);
    }
  });
  it("diz o que fazer em vez de só proibir", () => {
    expect(RECADO_BARRADO).toMatch(/diga|conte|sem atacar/i);
  });
});

describe("quem o texto aponta", () => {
  it("acha a segunda pessoa", () => {
    expect(vaiContraAlguem("você é")).toBe(true);
    expect(vaiContraAlguem("sua coisa")).toBe(true);
    expect(vaiContraAlguem("@maria")).toBe(true);
  });
  it("não vê alvo onde não tem", () => {
    expect(vaiContraAlguem("ela me disse isso ontem")).toBe(false);
  });
});

describe("normalizar não junta palavras separadas", () => {
  it("espaço entre letras continua espaço", () => {
    // "v a c a" virando "vaca" faria "Ela tem uma v a c a" ser barrado.
    expect(normalizar("v a c a")).toBe("v a c a");
  });
});

describe("a trava final é do banco, e o recado dela é humano", () => {
  it("traduz o erro do banco sem mostrar código técnico", () => {
    const r = recadoDoBanco({ message: 'new row violates "nommi_xingamento" check' });
    expect(r).toBe(RECADO_BARRADO);
    expect(r).not.toContain("nommi_xingamento");
  });
  it("erro que não é esse não vira recado de xingamento", () => {
    expect(recadoDoBanco({ message: "network error" })).toBeNull();
    expect(recadoDoBanco(null)).toBeNull();
  });
});

describe("a lista do banco e a lista da tela são a mesma", () => {
  // Duas listas que deveriam ser iguais sempre acabam diferentes. Este teste
  // lê a migração e compara, para a tela nunca deixar passar o que o banco
  // recusa (a pessoa escreveria e veria o texto sumir sem entender).
  const sql = readFileSync("drizzle/migrations/0043_respeito.sql", "utf8");
  const doSql = (nome: string) => {
    const bloco = sql.match(new RegExp(`${nome}[\\s\\S]*?\\$\\$([\\s\\S]*?)\\$\\$`))?.[1] ?? "";
    return [...bloco.matchAll(/'([a-z ]+)'/g)].map((m) => m[1]);
  };
  it("os xingamentos são os mesmos", () => {
    expect(doSql("palavras_de_xingamento").sort()).toEqual([...XINGAMENTOS].sort());
  });
  it("os ataques a grupo são os mesmos", () => {
    expect(doSql("palavras_de_ataque_a_grupo").sort()).toEqual([...ATAQUE_A_GRUPO].sort());
  });
});

describe("palavra que só é ofensa com alvo também está nos dois lados", () => {
  const sql = readFileSync("drizzle/migrations/0043_respeito.sql", "utf8");
  it("a lista do banco é a mesma da tela", () => {
    const bloco =
      sql.match(/palavras_so_com_alvo[\s\S]*?\$\$([\s\S]*?)\$\$/)?.[1] ?? "";
    const doSql = [...bloco.matchAll(/'([a-z ]+)'/g)].map((m) => m[1]);
    expect(doSql.sort()).toEqual([...SO_COM_ALVO].sort());
  });
});
