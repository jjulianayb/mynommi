import { createFileRoute } from "@tanstack/react-router";
import { DirectChatPage } from "@/components/friends/direct-chat-page";
export const Route = createFileRoute("/conversas_/$id")({
  head: () => ({
    meta: [
      { title: "Conversa — Nommi" },
      { name: "description", content: "Converse a sós com sua amizade no Nommi." },
      { property: "og:title", content: "Conversa — Nommi" },
      { property: "og:description", content: "Converse a sós com sua amizade no Nommi." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Page,
});
function Page() {
  return <DirectChatPage id={Route.useParams().id} />;
}
