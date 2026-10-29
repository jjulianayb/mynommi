/**
 * Quem responde pelos dados da nommi, e qual versão dos textos está no ar.
 *
 * É o único lugar que precisa mudar quando a Junta Comercial liberar o registro:
 * preencher `nome` e `documento`, mudar `tipo` para "empresa" e subir a VERSAO.
 * O texto da política e dos termos se ajusta sozinho.
 *
 * A LGPD aceita pessoa natural como controlador (art. 5º, VI), então a nommi
 * pode circular antes de o CNPJ sair — desde que o texto diga a verdade sobre
 * quem está respondendo.
 */
export const RESPONSAVEL = {
  tipo: "em_registro" as "em_registro" | "pessoa" | "empresa",
  nome: "",
  documento: "",
  endereco: "",
  email: "contato@nommibr.com.br",
};

/** Muda quando o texto muda. É o que fica gravado no aceite de cada pessoa. */
export const VERSAO_DOS_TEXTOS = "2026-10-29";

/** A frase de abertura da política: quem é o controlador, em português de gente. */
export function quemResponde(r = RESPONSAVEL) {
  if (r.tipo === "empresa" && r.nome && r.documento)
    return `A nommi é um aplicativo da ${r.nome}, CNPJ ${r.documento}${
      r.endereco ? `, em ${r.endereco}` : ""
    }. Somos nós que decidimos o que a nommi guarda e por quê.`;
  if (r.tipo === "pessoa" && r.nome)
    return `A nommi é tocada por ${r.nome}${
      r.endereco ? `, em ${r.endereco}` : ""
    }, enquanto o registro da empresa não sai. É ela quem decide o que a nommi guarda e por quê, e é ela quem responde por isso.`;
  return "A nommi está com o registro da empresa em andamento. Até sair, quem responde por tudo o que está escrito aqui é a pessoa que toca a nommi, pelo contato abaixo — e assim que o registro sair, o nome e o CNPJ aparecem nesta mesma linha, com aviso dentro do app.";
}

/** Quanto tempo a nommi guarda cada coisa. Prazo que a gente cumpre de verdade. */
export const PRAZOS = [
  { o: "Seu perfil, suas conversas e suas tribos", quanto: "Enquanto sua conta existir" },
  { o: "Story", quanto: "1 hora no ar, e some do servidor junto" },
  { o: "Seu lugar no radar", quanto: "Entre 15 minutos e 4 horas, o que você escolher" },
  { o: "Conta apagada por você", quanto: "Some na hora, sem volta" },
  { o: "Denúncia e dados de quem foi banido", quanto: "1 ano, para proteger quem denunciou" },
  { o: "O dia em que você abriu o app", quanto: "12 meses" },
] as const;

/** Nenhum texto da nommi pode afirmar que os dados ficam no aparelho. */
export function prometeDemais(texto: string) {
  return /fica.{0,12}neste navegador|dados locais|apenas neste aparelho|demonstra[çc]/i.test(texto);
}
