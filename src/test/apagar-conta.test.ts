import { readFileSync, readdirSync } from "node:fs";
import { describe, expect, it } from "vitest";

/**
 * A regra da casa: tabela nova com dado de pessoa entra nas **duas** funções,
 * a que exporta (`meus_dados`) e a que apaga (`apagar_minha_conta`).
 *
 * Em 31/10 isso falhou de um jeito que nenhum teste pegava: a correção do 403
 * ao apagar a conta reescreveu `apagar_minha_conta()` inteira a partir de uma
 * versão antiga, e a linha de `meus_lugares` — criada na migração seguinte —
 * sumiu no caminho. Os lugares do radar de alguém sobreviveriam ao apagar da
 * conta dela, que é justamente o que o texto no ar promete que não acontece.
 *
 * Reescrever a função inteira a cada correção é frágil, e vai acontecer de
 * novo. Então o teste compara as duas listas na última migração que mexe em
 * cada uma.
 */
const DIR = "drizzle/migrations";

function ultimaComFuncao(nome: string): string {
  const arquivos = readdirSync(DIR)
    .filter((f) => f.endsWith(".sql"))
    .sort();
  for (let i = arquivos.length - 1; i >= 0; i--) {
    const texto = readFileSync(`${DIR}/${arquivos[i]}`, "utf8");
    if (texto.includes(`FUNCTION public.${nome}(`)) return texto;
  }
  return "";
}

/** As tabelas de public que a função menciona. */
function tabelas(sql: string, nome: string): Set<string> {
  const i = sql.indexOf(`FUNCTION public.${nome}(`);
  const corpo = sql.slice(i);
  return new Set([...corpo.matchAll(/public\.([a-z_]+)\b/g)].map((m) => m[1] as string));
}

describe("apagar a conta apaga tudo o que a exportação devolve", () => {
  const apaga = tabelas(ultimaComFuncao("apagar_minha_conta"), "apagar_minha_conta");
  const exporta = tabelas(ultimaComFuncao("meus_dados"), "meus_dados");
  // Tabelas que aparecem na exportação por serem lidas de outro jeito, ou que
  // o apagar trata com regra própria.
  // "meus_dados" é o nome da própria função; "profiles" e "teias" o apagar
  // trata com regra própria (perfil por último, tribo só se ficou vazia).
  const fora = new Set(["meus_dados", "profiles", "teias", "sem_acento"]);

  it("nenhuma tabela exportada fica de fora do apagar", () => {
    const faltando = [...exporta].filter((t) => !apaga.has(t) && !fora.has(t));
    expect(faltando, "estas saem na exportação e não são apagadas").toEqual([]);
  });

  it("meus_lugares está nas duas", () => {
    // O caso concreto que falhou.
    expect(apaga.has("meus_lugares")).toBe(true);
    expect(exporta.has("meus_lugares")).toBe(true);
  });
});
