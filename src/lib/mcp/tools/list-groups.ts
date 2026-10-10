import { defineTool } from "@lovable.dev/mcp-js";
import { groups } from "@/lib/friends-data";

export default defineTool({
  name: "list_groups",
  title: "Listar grupos de exemplo",
  description: "Lista os grupos de amizade de exemplo do Nommi, com modo (presencial, online ou híbrido) e número de pessoas.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: () => {
    const list = groups.map((g) => ({ name: g.name, mode: g.mode, members: g.members }));
    return {
      content: [{ type: "text", text: list.map((g) => `${g.name} · ${g.mode} · ${g.members} pessoas`).join("\n") }],
      structuredContent: { groups: list },
    };
  },
});
