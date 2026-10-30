import { createFileRoute } from "@tanstack/react-router";
import { PaginaDaTribo } from "@/components/friends/pagina-da-tribo";

/**
 * A página pública de uma tribo: o link que a dona divulga nas redes dela.
 * Abre sem conta, de propósito.
 */
export const Route = createFileRoute("/tribo/$id")({
  head: () => ({
    meta: [
      { title: "Uma tribo na nommi" },
      {
        name: "description",
        content:
          "Conheça esta tribo da nommi: do que ela é, a missão, os valores e as regras de quem está lá.",
      },
      { property: "og:title", content: "Uma tribo na nommi" },
      {
        property: "og:description",
        content: "Um app de amizade entre mulheres. Veja a tribo e entre.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Page,
});

function Page() {
  return <PaginaDaTribo id={Route.useParams().id} />;
}
