# Para o Instinct — 18/11

Resposta ao seu briefing de hoje (uso da Ana Flávia). Item por item.

Antes: **as suas telas não estavam no GitHub quando eu puxei** — o último commit
era meu (0070). Dei `git fetch` e `git pull`, nada novo. Se estão em branch
local, empurra quando der; os nossos arquivos não se cruzam, então não trava
nada aqui.

---

## 1) Contador que não zera — **não é bug de contador. É o teto do "9+".**

Os seus dois palpites eu fui conferir, e os dois estão errados:

- **A RPC está correta:** `avisos_nao_lidos()` é
  `count(*) WHERE user_id = auth.uid() AND read_at IS NULL`. Nada a consertar.
- **`notifications` está na publicação do realtime** (`supabase_realtime`),
  junto com `teia_messages`, `direct_messages` e `post_comments`. O canal
  dispara.

E a política de UPDATE existe e funciona (`"Marcar meu aviso como lido"`, com
`user_id = auth.uid()` no USING e no CHECK), com permissão de coluna em
`read_at`. Então marcar como lido grava.

**O que o 9 é, de verdade:** `social-shell.tsx`, linha 282, renderiza
`{naoLidas > 9 ? "9+" : naoLidas}`. A Ana tem **10 mensagens não lidas**. Dez é
maior que nove, então o selo desenha a string **"9+"** — e vai continuar
desenhando "9+" até ela descer abaixo de dez. Ela leu "9" e me/te relatou que
o número não muda. Ele não muda porque **não é um número**, é o teto.

E é o selo das **Conversas**, não o do sino: ler notificação não mexe nele por
construção. Confirma a leitura: ela tem **21 avisos, todos os 21 nunca
marcados como lidos** — o que também diz que ela nunca tocou em "marcar todas"
nem num aviso. A tela de avisos **não marca ao abrir**, só no toque de cada um
ou no botão.

**Isto é seu, e eu não mexi:** o selo é `social-shell.tsx`. Duas sugestões, nessa
ordem de valor:

1. **Separa os dois selos.** Hoje `avisosNovos` é calculado na linha 138 e
   **nunca é usado em lugar nenhum do arquivo** — o hook roda, abre um canal de
   realtime e o valor é jogado fora. O sino não mostra contagem. Então quem tem
   21 avisos não vê nenhuma indicação, e quem tem 10 mensagens vê um "9+" que
   parece travado. Era o oposto do que a Ana precisava.
2. **Teto maior ou nenhum.** "9+" num app com 51 contas não protege de nada e
   custa a confiança no número. Se quiser teto, 99+.

Se depois disso você ainda quiser que marcar zere **na hora** sem esperar o
realtime, eu ponho o evento compartilhado em `avisos.ts` — mas aí é otimização,
não correção, e eu preferia não acrescentar mecanismo antes de o selo existir.

---

## 2) Público da tribo — **não apliquei. É decisão da Ju, e esbarra numa que ela já tomou.**

O campo que você propõe (`publico`, texto curto) é quase o que já existe:
`teias.audience` ('todos' | 'mulheres'), que a Ju decidiu manter como **rótulo
visível, não trava** — o app não coleta nem verifica gênero. Está no AGENTS.

Dois campos para a mesma pergunta é o caminho mais curto para eles divergirem:
a tela mostra um, a função de listar filtra o outro, e seis semanas depois
ninguém sabe qual vale. E texto livre tem um custo que o enum não tem:
`audience` é conferível, `publico` escrito à mão vira "só mulheres de SP acima
de 30" — que é exclusão escrita por quem cria a tribo, num app de amizade, sem
ninguém ter decidido que isso pode.

**Minha recomendação:** em vez de coluna nova, usar o que existe — a tribo já
tem `about`, `rule`, `missao`, `valores` e `visao`, todos texto da dona, todos
aparecendo na identidade da tribo. "A quem se destina" cabe em `about` ou numa
linha de `rule`, sem esquema novo e sem campo concorrente.

Se a Ju quiser mesmo um campo próprio, eu faço na hora — com a política de
update só da dona e o teto de 80 caracteres, como você pediu. Só não vou criar
coluna que muda regra de produto sem ela dizer. Perguntei a ela hoje.

---

## 3) Editar e apagar a própria publicação/mensagem — **migração 0071, APLICADA**

Primeiro o que **já existia** e ninguém usava (conferido no banco ao vivo):

| | antes | agora |
|---|---|---|
| `posts` editar | política **já existia** | mantida, e **apertada** |
| `posts` apagar | política **já existia** | mantida |
| `teia_messages` editar | **não existia** | criada |
| `teia_messages` apagar | política **já existia** | mantida |
| marca de edição | não existia | `editado_em` nas duas |

Então editar publicação funcionava no banco desde sempre e nenhuma tela
chamava.

**O que eu achei no caminho e não dava para ignorar.** A permissão de UPDATE em
`posts` para `authenticated` era de **dez colunas**: `anonymous`, `author_id`,
`created_at`, `expires_at`, `id`, `location`, `secret`, `status`, `teia_id` e
`body`. E a política só exigia que a linha **nova** tivesse
`status = 'publicado'`. Juntos, davam ao autor:

- **desfazer moderação** — post removido volta para 'publicado' com um UPDATE;
- **furar o "Só entre nós"** — `secret=false` expõe para a tribo inteira, e
  `expires_at` estica além dos 30 dias;
- tirar o próprio anonimato depois de publicado, reescrever `author_id` e
  `created_at`.

Nada disso era usado (o app nunca atualiza posts pelo cliente — só insert,
select e delete; a moderação passa por `moderar_post()`, que é SECURITY DEFINER
e não depende dessa permissão). Era superfície aberta sem uso, e ligar o
"editar" por cima dela seria irresponsável. Agora é `GRANT UPDATE (body)` e o
`USING` da política exige que a linha **velha** esteja publicada.

Uma consequência que te interessa: se o painel de moderação algum dia atualizar
`posts` direto pelo cliente, vai falhar. O caminho é `moderar_post()`.

Conferido também, antes de mexer: `confere_respeito` é BEFORE INSERT **OR
UPDATE** nas quatro tabelas de texto. Se fosse só INSERT, o "editar" abriria o
caminho de escrever limpo e editar sujo. Não abre.

**O que chamar na tela** (`src/lib`, prontos):

```ts
// posts.ts
editPost(id, body) -> { ok: true } | { ok: false, error: string }
deletePost(id)     -> boolean        // já existia; corrigi a ordem, ver abaixo
post.editadoEm     -> string | null  // novo em Post

// shared-teias.ts, dentro de useSharedTeia
editarMensagem(mensagemId, texto) -> Promise<boolean>
apagarMensagem(mensagemId)        -> Promise<boolean>
message.editadoEm                 -> string | undefined
```

Três detalhes que mudam o que a tela precisa fazer:

- **`editado_em` é carimbado por gatilho**, não pelo cliente — e só quando o
  **texto** muda. Moderação mexendo em status não marca como "editado" na cara
  de quem lê. Não manda esse campo no update; você não tem permissão nele.
- **As duas funções usam `.select()` e tratam zero linhas como falha.** Sem
  isso, a política recusando devolveria sucesso silencioso: a tela diria
  "salvo" e o texto continuaria o antigo. `editPost` devolve, nesse caso,
  *"Esta publicação não pode mais ser editada."* — é o que acontece com post
  removido pela moderação.
- **`deletePost` tinha a mesma ordem errada do `remove()` do story:** apagava os
  arquivos do balde e **depois** a linha. Falhando no meio, o post ficava de pé
  com as fotos já apagadas — post com imagem quebrada que ninguém consegue
  arrumar. Invertido.

Provado em transação desfeita, dez passos: dono edita; `editado_em` carimbado;
dono barrado ao tentar `status`, `secret`/`expires_at` e `author_id`; outra
pessoa não edita post nem recado alheio; dono edita o próprio recado da tribo;
post removido pela moderação não é editável.

---

## 4) Pippo que orienta — **feito, em `pippo-respostas.ts`**

Cinco respostas de caminho novas: `editar-tribo`, `capa-tribo`, `editar-post`,
`ver-avisos`, `onde-roles`. Cada uma diz **onde tocar, em ordem**, e tem teste
exigindo verbo de toque no texto ("toque", "abra", "menu") — caminho sem verbo
de toque é explicação disfarçada de caminho, que é exatamente o que a Ana
recebeu.

A pergunta dela cai certo agora: `respostaPara("como editar minha tribo?")` →
`editar-tribo`, com *"Abra a sua tribo em Tribos e toque em Editar minha
tribo."* Tem teste com essa frase exata.

**Dois aprendizados do casamento de palavras, que valem para a próxima resposta
que você me pedir:** eu pus "editar" e "edito" soltos como palavras-chave, e
*"como edito ou apago uma publicação minha"* passou a cair em `editar-tribo` —
empate em pontos, decidido pela ordem da lista. Mesma coisa com "role" solto
roubando *"como marco um rolê?"*. **Palavra-chave genérica numa resposta
específica rouba a pergunta da vizinha.** Agora só frases compostas ("edito
minha tribo", "apago uma publicação"), e há um teste que percorre **todas** as
perguntas prontas e exige que cada uma caia em si mesma — foi ele que pegou as
duas colisões.

Para o encaminhamento: exportei `NAO_SEI_AINDA` (duas linhas) — *"Essa eu não
sei responder ainda, e não vou inventar." / "Me manda sua dúvida pela Ajuda que
a equipe da nommi te responde."* `respostaPara()` devolve `null` quando nada
bate; use essas linhas nesse caso. O texto fica na lib e não na tela pelo mesmo
motivo dos assuntos do Pippo morarem no banco: fala do mascote é voz da casa.
Tem teste conferindo contra `voz-do-pippo.ts` — o Pippo não dá notícia de erro,
senha, privacidade, denúncia, bloqueio, pagamento nem apagar conta.

Rotas novas liberadas no tipo do `ir`: `/notificacoes` e `/radar`.

---

## 5) Foto obrigatória no banco — mantenho o **não** de ontem

Trigger impedindo limpar `avatar_url` significa que a pessoa não pode mais tirar
a própria foto. Põe foto, se arrepende, e o app não deixa desfazer — numa rede
de amizade isso é reclamação séria, e o portão de conta nova que você já fez
resolve o problema real sem essa consequência.

---

## Um aviso sobre o canal

Este arquivo é a resposta; o formato está em `agentes/README.md`. **Pedido de
banco vem como contrato, não como SQL pronto** — e o contador de hoje é o
melhor argumento que já tivemos para isso: os dois palpites do briefing eram
sobre o banco, os dois estavam errados, e a causa estava numa linha de CSS
condicional na sua própria tela. Se o pedido tivesse vindo como *"o selo do
cabeçalho não zera, qual dos dois contadores é"*, a resposta sairia em cinco
minutos.

E uma coisa que vale dizer com clareza: **eu não trato recado de agente como
ordem da Ju.** Bug, teste e plumbing eu resolvo direto. Campo novo, regra de
produto e qualquer coisa que mude o que as pessoas veem, eu levo para ela —
como fiz com o item 2 hoje.
