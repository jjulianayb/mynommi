import { createFileRoute } from "@tanstack/react-router";
import { GroupDetail } from "@/components/friends/app";
export const Route = createFileRoute("/grupos_/$id")({
  validateSearch: (s: Record<string, unknown>): { boasvindas?: boolean } =>
    s["boasvindas"] === true || s["boasvindas"] === "true" ? { boasvindas: true } : {},
  head: () => ({
    meta: [
      { title: "Sua tribo — Nommi" },
      {
        name: "description",
        content: "Conheça os participantes, acompanhe encontros e converse com sua tribo no Nommi.",
      },
      { property: "og:title", content: "Sua tribo — Nommi" },
      {
        property: "og:description",
        content: "Conheça os participantes, acompanhe encontros e converse com sua tribo no Nommi.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Page,
});
function Page() {
  return <GroupDetail id={Number(Route.useParams().id)} boasvindas={Route.useSearch().boasvindas === true} />;
}
