// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { writeFileSync } from "node:fs";
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

// Carimbo desta publicação: fica dentro do pacote e também num arquivo solto,
// para o app aberto há dias conseguir perguntar se já mudou.
const VERSAO = String(Date.now());

export default defineConfig({
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
  vite: {
    define: { __NOMMI_VERSAO__: JSON.stringify(VERSAO) },
    plugins: [
      {
        name: "nommi-versao",
        apply: "build",
        buildStart() {
          writeFileSync("public/versao.json", JSON.stringify({ versao: VERSAO }) + "\n");
        },
      },
    ],
  },
});
