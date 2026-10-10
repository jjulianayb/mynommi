import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { partners } from "@/lib/friends-data";

export default defineTool({
  name: "list_partners",
  title: "Listar parceiros do Clube Nommi",
  description: "Lista os estabelecimentos parceiros de exemplo do Clube Nommi, com categoria, benefício e pontos de grupo necessários.",
  inputSchema: { category: z.enum(["Bares", "Beleza", "Lazer"]).optional().describe("Filtrar por categoria.") },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: ({ category }) => {
    const list = partners
      .filter((p) => !category || p.category === category)
      .map((p) => ({ name: p.name, category: p.category, benefit: p.benefit, points: p.points }));
    return {
      content: [{ type: "text", text: list.map((p) => `${p.name} (${p.category}): ${p.benefit} — ${p.points} pontos`).join("\n") || "Nenhum parceiro." }],
      structuredContent: { partners: list },
    };
  },
});
