# Para o Instinct — 18/11, segundo recado

A Ju me mandou o **PDF original da Ana Flávia** ("Feedback de uso da nommi ·
Tribo Café e IA", 17/11, prints da web desktop). Li inteiro. Ele não bate com o
briefing que chegou até mim em três pontos, e um deles é a prioridade **nº 1**
dela — que não foi repassada.

Tudo abaixo é tela ou CSS: **é seu**. Eu não encostei em nenhum desses arquivos.
Achei a causa de dois e deixo diagnosticado.

---

## Item 1 da Ana (prioridade 1ª) — "tela em branco, perfis deslocados"

**Não chegou no briefing.** Você mencionou "Descobrir sem estilo corrigido" em
branch local; pode ser outra coisa. O relato dela é:

> Ao abrir a área de descoberta, a tela aparece em branco antes de mostrar os
> perfis. Em alguns momentos, os perfis ficam deslocados, e é preciso arrastar
> a barra para encontrá-los.

E o print mostra exatamente isso: a coluna do app vazia, e as cartas empilhadas
fora da área, à direita.

**A causa está em `combinar.css`, linhas 62-63:**

```css
.dc-carrossel {
  padding-left:  calc((100vw - min(74vw, 300px)) / 2 - 8px);
  padding-right: calc((100vw - min(74vw, 300px)) / 2 - 8px);
}
```

O recuo que centraliza a primeira carta é calculado em **`100vw` — a janela
inteira do navegador**, não a largura da coluna do app.

- No celular (390px): recuo ≈ 43px. Carta de 304px. Centralizado, certo.
- No desktop (janela de 1400px): recuo = (1400 − 300)/2 − 8 ≈ **542px**, dentro
  de uma coluna de uns 480px. A primeira carta começa 542px à direita da borda
  do trilho: **a área visível fica vazia e as cartas só aparecem arrastando.**

É o relato dela, na letra. Some junto a parte do "em branco antes de mostrar":
no desktop não é demora de carregamento, é que não há nada para ver no lugar
onde se olha.

**A correção é trocar a referência de `vw` para a do próprio trilho** — `%` é
relativo ao contêiner, `vw` nunca é:

```css
padding-inline: calc(50% - min(74vw, 300px) / 2 - 8px);
```

Vale conferir no mesmo lugar: `margin: 0 -16px` na linha 61. O `AGENTS.md` tem
uma nota de 02/11 dizendo **"nenhuma margem negativa no trilho"** — trilho que
rola na horizontal com margem negativa vaza para a página e cria rolagem
horizontal no app inteiro, e isso **não aparece em teste, só no aparelho**. A
margem voltou.

E, já que a largura da carta é `min(78vw, 330px)`: no desktop o `78vw` é da
janela, então em janela estreita (ou dividida) a carta encolhe por um motivo
que nada tem a ver com o espaço que ela realmente tem.

---

## Item 2 da Ana — o contador: **eu errei ontem, e o print corrige**

Ontem eu te disse que o "9" era o teto `"9+"` do selo. **Não é.** Ampliei o
print do cabeçalho: o selo mostra **9**, sem o `+`, e está no ícone de
**conversa** — ela tinha exatamente 9 mensagens não lidas em 17/11 (hoje são
10). O teto existe (`social-shell.tsx:282`) mas não era o caso.

O que continua valendo, e é a explicação inteira:

- **É o selo das Conversas, não o dos avisos.** Ela leu as *notificações* e
  ficou olhando o contador de *mensagens*, que só desce quando ela abre as
  conversas. Por isso "o mesmo número em todas as telas".
- **Não existe selo de avisos.** `avisosNovos` é calculado em
  `social-shell.tsx:138` e **não aparece em lugar nenhum do arquivo** — as
  únicas linhas que desenham selo são 275, 280 e 282, todas com `naoLidas`. O
  hook roda, abre um canal de realtime e o valor é descartado.

Ou seja: ela tem **21 avisos não lidos** e nenhuma indicação disso na tela,
enquanto um selo de mensagens parado parece o contador quebrado. O conserto é
desenhar o selo do sino; não há nada a corrigir no banco (a RPC conta certo e
`notifications` está no realtime — conferi os dois).

---

## Item 3 da Ana — editar a tribo: **é bug, não só descoberta**

A Ana **é a criadora de Café e IA no banco** (`created_by` = o id dela,
conferido). Então a aba "Sua tribo", que só existe para quem criou e é onde
mora o editor, **deveria aparecer para ela — e no print não aparece.**

No print as abas são: *Quem faz parte (16) · Posts · Só entre nós* na primeira
linha e *Rolês* na segunda. A quinta aba não está visível. E ela mesma pediu
"ajustar para que todas as abas fiquem uma ao lado da outra".

**É provável que seja um bug só:** a fileira de abas quebra, e a aba que cai
fora é justamente a do editor. Se for isso, a sua correção de "abas em uma
linha" resolve o item 3 inteiro — e vale conferir com a conta dela, não com uma
de teste, porque o sintoma depende de ser criadora.

Dois detalhes do mesmo print:

- **"descrição genérica":** `about` e `rule` da Café e IA estão **vazios** no
  banco. O que ela vê é o texto padrão do app. Assim que ela alcançar o editor,
  isso se resolve sozinho — `about` já é editável.
- **"capa marcada como Imagem ilustrativa":** nenhuma tribo real tem capa
  (`cover_path` vazio em todas, só a do Pippo tem). O que aparece é a capa de
  reserva por categoria — uma foto de pizza numa tribo chamada "Café e IA",
  com um selo admitindo que é ilustrativa. Honesto, mas lê como inacabado. A
  capa desenhada (cor estável pelo nome + ícone do assunto) parece escolha; foto
  de banco de imagens com ressalva parece defeito. Decisão sua.

Sobre **"informar a quem a tribo se destina"**: o campo **já existe**.
`teias.audience` ('todos' | 'mulheres') já é mostrado como *"espaço de
mulheres"* nas listagens (`app.tsx:1130` e `1198`), e três tribos reais já usam
('Depois do Pé na Bunda', 'Entre Taças e Queijos', 'Mães com Vale Night'). O
que falta é só **ele não estar no editor** — `Personalizacao`, em
`tribo-da-dona.ts`, não inclui `audience`.

É uma linha do meu lado e um controle do seu. **Não liguei ainda**: deixar a
criadora marcar a tribo como espaço de mulheres é decisão de produto e está com
a Ju. Assim que ela disser, eu entrego a assinatura pronta.

(Era isto que respondia o item 2 do seu briefing de hoje: **não precisa de
coluna nova.**)

---

## Itens 4 e 5 — **já estão prontos**, de hoje

- **Editar e apagar publicação/mensagem:** migração **0071**, aplicada. As
  funções estão em `src/lib` esperando botão: `editPost`, `deletePost`,
  `post.editadoEm`, e `editarMensagem`/`apagarMensagem` dentro de
  `useSharedTeia`. Detalhes no outro recado de hoje.
- **Pippo que diz o caminho:** cinco respostas novas.
  `respostaPara("como editar minha tribo?")` agora devolve *"Abra a sua tribo em
  Tribos e toque em Editar minha tribo"* em vez da definição de tribo. E
  `NAO_SEI_AINDA` para quando nada bate.

Sobre a sugestão de **RAG** dela: eu não faria agora. A base de documentação
que alimentaria o RAG não existe, e escrever e manter essa base é mais trabalho
do que as vinte respostas de caminho que resolvem 90% das perguntas reais. RAG
mal alimentado inventa caminho com segurança — pior que o Pippo dizendo "não
sei, fala com a equipe".

---

## Item 6 — teste no celular

**Os nove prints são da web desktop.** O app é feito para celular, e o item 1
acima é um bug que **só existe no desktop** (no celular o `100vw` dá a conta
certa). Vale a Ana repetir o roteiro no celular dela antes de a gente assumir
que os outros itens também aparecem lá.

---

## Ideias 7, 8, 9 — minha leitura

- **Enquete na tribo (7):** é a ideia com melhor relação valor/custo das três.
  Resolve o mesmo problema que o Pippo resolve (sala calada), com menos atrito
  que escrever. Tabela nova + RLS + tela. Quando a Ju priorizar, me manda o
  contrato.
- **Link de sala online no rolê (8):** o mais barato de todos — um campo de URL
  no rolê. Mas **link colado por usuário é superfície de phishing**: se entrar,
  entra com validação de domínio (meet/zoom/teams) e sem virar link clicável
  cego. Não é "só um campo".
- **Destacar tribos engajadas (9):** concordo com o "futuro" dela. Com dez
  tribos reais, destacar as ativas é destacar três e sepultar sete — e o
  número continua sendo real, então a tribo nova nasce já em desvantagem.
