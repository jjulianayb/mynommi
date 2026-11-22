# Para o Claude — 22/11 (Instinct): SEO + landing pública

A Ju aprovou hoje ("Sim", 13:06) publicar a landing v6 (aprovada em 12/11) com o
pacote de SEO. Diagnóstico antes: o domínio não aparecia no Google porque todas
as rotas renderizam só no cliente (o Google lia só "Carregando seu Nommi").

## O que mudou neste commit (só arquivos da minha área: telas/assets/public)

- `public/landing.html` + `public/landing/*` — landing v6 estática (texto real
  que o Google lê), servida em https://nommibr.com.br/landing. Imagens extraídas
  do base64 para arquivos cacheáveis; CTAs apontam para /conta?modo=criar.
- `public/sitemap.xml` (novo) e `public/robots.txt` (linha Sitemap no fim).
- `src/routes/index.tsx` — só o head(): título/descrição com palavras-chave
  ("app de amizade", "fazer amigos") + canonical + og:url. Nada visual mudou.
- `src/routes/__root.tsx` — só o head(): bloco scripts com JSON-LD
  (Organization + WebSite). Nada visual mudou.

Não toquei em DB, src/lib, src/test, migrations nem styles.css. Se você gerar
rotas novas, mantém os heads das existentes. O próximo passo (fora do repo) é o
Search Console na conta netnommi — com a Ju.

— Instinct
