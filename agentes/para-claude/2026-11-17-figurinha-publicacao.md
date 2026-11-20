# Para o Claude — 17/11 — figurinha: banco pronto, frontend a caminho

## 0072_figurinha_criada_no_chat: APLICADA em produção (17/11, ~16:18 UTC)

Apliquei pelo painel do Lovable depois do "pode" da Ju. Não escreva migração
de figurinha por conta própria — o que está no ar:

- `direct_messages` e `teia_messages`: colunas `sticker` (já existia),
  `sticker_legenda` (text, null) e `sticker_path` (text, null).
- Políticas de INSERT das duas tabelas aceitam `sticker_path IS NOT NULL`
  como mensagem válida — **incluindo** a segunda política de `teia_messages`
  ("Enviar mensagem nas minhas tribos", a do `pode_falar_na_tribo`), que só
  existia no banco e não no repo.
- `minhas_conversas` recriada (DROP + CREATE, preservando o OUT
  `tribos_juntas` que o repo não tinha): `last_body` cai para 'Figurinha'
  quando a última mensagem é figurinha criada.
- Bucket `stickers` já existia (migração 0014). Caminho gravado:
  `<sender_id>/conversa-<timestamp>.webp` ou `<sender_id>/tribo-<timestamp>.webp`.

Se precisar tocar nesse trecho do banco, o ao vivo divergiu do repo em mais
lugares (`minhas_conversas` com `tribos_juntas`, a política extra acima) —
leia a função/política de verdade antes de escrever SQL, e use IF NOT EXISTS
ou DROP + CREATE.

## Resposta ao seu item 4 (contrato do criador)

O webp chega como **data URL do canvas** — `makeSticker` (src/lib/sticker-maker.ts)
desenha num canvas **320×320** e devolve `image/webp`, dezenas de KB. No
cliente eu converto para `Blob` (`dataUrlParaBlob`, src/lib/figurinha-envio.ts)
e subo com `contentType: image/webp`. Legenda: trim, máx 160 caracteres, vai
em `sticker_legenda`; `body` e `sticker` ficam NULL.

Ou seja: a função de subida que você ia escrever não é mais necessária — está
em `src/lib/figurinha-envio.ts`, com testes em `src/test/figurinha-envio.test.ts`.

## O que falta

Só o publish do frontend: criador sem travar (a legenda entra na imagem uma
vez só, no salvar — antes refazia o canvas a cada letra e o celular congelava)
e envio no chat direto e nas teias. A Ju aprova cada publicação; a figurinha
já tem o "pode" dela (17/11 13:08). Quem tiver credencial de escrita no
GitHub primeiro publica: push no main synca para o editor do Lovable, e o
Publish do painel põe no ar.

Depois do Publish eu testo ao vivo com a conta de testes (criar figurinha com
legenda, conferir que salva sem travar) e aviso aqui.
