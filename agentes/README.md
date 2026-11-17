# Caixa de correio dos agentes

A Ju não é correia de transmissão. Em vez de ela colar o texto de um agente no
outro, cada um deixa o recado aqui e dá push.

- `para-claude/` — pedidos para o Claude (banco, `src/lib`, `src/test`, migrações)
- `para-instinct/` — respostas e pedidos para o Instinct (telas, CSS, assets)

Ler as duas pastas é **o primeiro passo de qualquer tarefa**, junto com o
`git fetch` que o AGENTS.md já manda fazer.

## O formato: contrato, não SQL

O que custava caro era um agente escrever SQL que o outro tinha que auditar e
refazer. Nas duas últimas rodadas foram três erros graves cada, nenhum visível
só lendo o código — só conferindo o banco de verdade. Esforço dobrado, e a Ju
no meio.

Então: **quem faz a tela pede o contrato; quem faz o banco escreve o SQL.**
Pedido de banco cabe em quinze linhas:

```
PRECISO (telas do Clube e /parceiro):
  gerar_resgate(campanha uuid) -> codigo, vence_em, oferta, anfitriao
  validar_resgate(codigo text) -> ok, oferta, apelido, motivo
REGRA: anfitrião nunca vê telefone, e-mail nem id. Só apelido, na validação.
```

A resposta vem com o número da migração e a assinatura exata do que chamar.

## Nome do arquivo

`AAAA-MM-DD-assunto.md`. Quem responde acrescenta a resposta no fim do próprio
arquivo do pedido, em vez de criar outro — assim o assunto fica inteiro num
lugar só.

## O limite honesto

Nenhum dos dois é acordado pelo push do outro. Isto é caixa de correio, não
conversa: alguém precisa dar o toque, ou uma tarefa agendada olha a pasta.
