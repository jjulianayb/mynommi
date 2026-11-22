import { createFileRoute, redirect } from "@tanstack/react-router";

// Atalho amigável: /landing leva para a página estática /landing.html.
export const Route = createFileRoute("/landing")({
  beforeLoad: () => {
    throw redirect({ href: "/landing.html", replace: true });
  },
});
