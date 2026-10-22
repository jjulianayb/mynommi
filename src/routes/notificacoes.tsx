import { createFileRoute } from "@tanstack/react-router";
import { AvisosPage } from "@/components/friends/avisos-page";
export const Route = createFileRoute("/notificacoes")({
  head: () => ({
    meta: [
      { title: "Avisos — Nommi" },
      {
        name: "description",
        content:
          "Veja o que aconteceu enquanto você estava fora: pedidos de amizade, comentários e quem entrou na sua tribo.",
      },
      { property: "og:title", content: "Avisos — Nommi" },
      { property: "og:description", content: "Veja o que aconteceu enquanto você estava fora." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Page,
});
function Page() {
  return <AvisosPage />;
}
