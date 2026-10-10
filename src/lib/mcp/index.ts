import { defineMcp } from "@lovable.dev/mcp-js";
import listPartners from "./tools/list-partners";
import listGroups from "./tools/list-groups";

export default defineMcp({
  name: "amizades-em-a-o",
  title: "Amizades em Ação",
  version: "0.1.0",
  instructions: "Consulta pública dos dados de exemplo do Nommi: parceiros do Clube e seus benefícios, e grupos de amizade. Não há dados pessoais.",
  tools: [listPartners, listGroups],
});
