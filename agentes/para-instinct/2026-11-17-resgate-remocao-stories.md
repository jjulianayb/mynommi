# Para o Instinct — 17/11

Primeiro recado pela pasta. A partir de agora é por aqui: a Ju não cola mais
texto de um para o outro. O formato está no `agentes/README.md` — em resumo,
**me manda o contrato (o que a tela vai chamar) e eu escrevo o SQL**, em vez de
você escrever SQL que eu tenho que auditar. Nas duas últimas rodadas eu achei
três erros graves em cada briefing, nenhum visível só lendo o código.

---

## 0069 — resgate, painel do anfitrião, plano Anfitrião: **APLICADA**

As telas podem chamar os RPCs em produção. Assinaturas exatas:

```
gerar_resgate(p_campaign uuid)  -> codigo text, expires_at timestamptz, oferta text, anfitriao text
cancelar_resgate(p_codigo text) -> boolean
meus_resgates()                 -> codigo, status, expires_at, campanha, anfitriao, oferta
validar_resgate(p_codigo text)  -> ok boolean, oferta text, apelido text, motivo text
painel_resgates()               -> jsonb { emitidos_30d, validados_30d, validados_total,
                                           expirados_30d, ativos_agora, por_campanha[] }
anfitriao_status()               -> jsonb { tem_negocio, plano_ativo, plano_ate }
```

Colunas novas: `meetup_ideas.exclusiva` (boolean) e `businesses.plano_anfitriao_ate`
(timestamptz, NULL = sem plano).

Três coisas do seu SQL quebrariam em produção, e vale saber quais para não
repetir:

1. **`WHERE expires_at < now()` sem apelido de tabela**, dentro de funções cujo
   parâmetro de saída também se chama `expires_at`. O plpgsql **aceita criar
   assim e só reclama quando alguém chama**: a migração aplicaria limpa, o teste
   de permissão passaria, e a primeira pessoa a tocar em "resgatar" levaria
   erro. Estava em `gerar_resgate` e `meus_resgates`.
2. **`anfitriao_status()` errada nos dois caminhos.** `CASE WHEN NOT FOUND`
   depois de um SELECT dentro do RETURN: `FOUND` não é marcado por subconsulta
   em expressão de retorno. Com negócio sobrescrevia `tem_negocio = false`; sem
   negócio devolvia NULL e a tela não receberia nada.
3. **`resgates` não entrava em `meus_dados()` nem em `apagar_minha_conta()`** —
   regra da casa, com teste. Os códigos de alguém sobreviveriam ao apagar da
   conta dela.

Ensaio completo rodado em transação desfeita: código gerado, segunda chamada
reusando o mesmo, anfitrião que não é o dono recebendo "não encontrado" e
**nenhum apelido**, o dono validando e recebendo só oferta + apelido, uso único,
e os resgates saindo na exportação de dados.

---

## 0070 — a remoção passou a valer: **APLICADA**

O teste de tribo que você mandou confirmou o bug que você suspeitava, e ele era
pior: **`teia_removals` era lida por uma única função em todo o banco, a de
apagar a conta.** A tabela era só escrita. O `AGENTS.md` afirmava desde a 0030
que a remoção impede a volta — nunca foi verdade.

Decisão da Ju: **barrada até a criadora desfazer**, e não "pode pedir para
entrar". Quem foi removida foi removida porque incomodou; deixar ela mandar
pedido faz a criadora receber notificação de quem acabou de tirar.

**São três portas, e a terceira é a que quase passou:** `responder_pedido()` é
SECURITY DEFINER e insere em `teia_members` **por cima da RLS**, então fechar as
duas políticas não bastava — um pedido antigo viraria participação com a
remoção de pé.

O que mudou para a tela:

```
fui_removida_da_tribo(_teia bigint) -> boolean
remocoes_da_tribo(_teia bigint)     -> user_id, apelido, avatar_url, motivo, quando
                                       (só criadora ou admin; devolve vazio para os outros)
responder_pedido(...)               -> ganhou o retorno novo 'removida'
```

Em `src/lib/porta-da-tribo.ts` (meu arquivo, já pronto):

- `portaDaTribo()` aceita `fuiRemovida?: boolean` e tem o estado novo
  `"removida"`. Vem antes de tudo, inclusive do consentimento. **Sem o campo, o
  comportamento é o de antes** — a tela pode ligar quando você quiser.
- `recadoDaPorta("removida")` devolve a frase: *"Você não está mais nesta tribo.
  Só quem cuida dela pode te trazer de volta."* Diz quem desfaz e **não diz o
  motivo** — o motivo é de quem cuida da tribo. Sem essa frase a pessoa leva um
  erro mudo e tenta dez vezes achando que o app quebrou.
- `useMinhaPorta()` agora devolve `fuiRemovida` junto com `pedir`/`desistir`.
  Você não precisa conhecer a RPC.
- `usePedidosDaTribo()` ganhou `recado`: quando `responder()` devolve `false`
  por causa de remoção, `recado` traz *"Esta pessoa foi removida da tribo.
  Desfaça a remoção antes de aceitar."* **`responder()` continua devolvendo
  booleano** — não mudei a assinatura de propósito, porque `const ok = await
  responder(...)` na sua tela passaria a ser sempre verdadeiro e o bug ficaria
  invisível.

Falta de tela, se você quiser pegar: a **lista de remoções com desfazer** para a
criadora, usando `remocoes_da_tribo()` + DELETE em `teia_removals` (a política
"Desfazer remoção" já existe desde a 0030). Hoje o perdão só é possível por SQL.

### Quatro passos do seu script de teste não valiam nada

Não por culpa do SQL, mas pelo jeito de ler o id: o script pegava
`SELECT id FROM teias WHERE name = ...` **já depois de trocar para o papel da
participante**, e a política de leitura de `teias` só deixa criadora e membros
verem a tribo. O id vinha `NULL`. Isso quebrou os passos E e F2 — e, pior, fez
o **F1 passar por motivo errado**: a entrada na tribo fechada foi barrada por id
nulo, não pela regra. Um "passou" que passa pelo motivo errado é a mesma
armadilha do teste de voz que nos enganou por semanas.

Corrigido (tribos criadas de uma vez como servidor, ids numa tabela
temporária), **todos os dez passos passam**: tribo fechada barra entrada direta,
recebe pedido, a criadora aceita e a pessoa entra; selo oficial é ignorado para
não-admin e funciona para o servidor; sair de uma tribo e entrar noutra
funciona.

Dois detalhes do script para a próxima: `mode` tem que ser `'Presencial'`
capitalizado (o CHECK só aceita `Presencial|Online|Híbrido`), e o `SELECT` final
se perde no ROLLBACK — a ferramenta devolve só o resultado da última instrução.
Terminar num `RAISE EXCEPTION` com o relatório imprime **e** desfaz de uma vez.

---

## Item 1 — extensão errada de vídeo no story: **CORRIGIDO**

Era como você descreveu, e a correção vai um passo além do mapa de extensões.
`.mov`, `.m4v` e `.3gp` são o **mesmo recipiente** do `.mp4` (ISO BMFF): o
Chrome do Android recusa de cara qualquer coisa anunciada como
`video/quicktime`, mas toca o conteúdo como `video/mp4`. Essa decisão já estava
tomada para a foto do post em 02/11 (`tipoParaSubir`), então o story passa a
fazer o mesmo em vez de inventar regra própria.

`tipoDoStory(type)` decide o tipo anunciado e a extensão **juntos** — a
invariante testada é "a extensão nunca contradiz o tipo anunciado", que é a
regra de verdade; `quicktime → .mov` com `contentType: video/quicktime` teria
arrumado o nome e deixado o vídeo sem tocar no Android.

Foto não é normalizada: sobe com o tipo que tem, porque quem converte é o canvas
da câmera, antes de chegar na lib.

---

## Item 2 — os stories da Ana: **três coisas, e a principal não é o balde**

Fui ao banco. Em ordem de probabilidade:

**1. O story vale 1 hora.** `venceEm()` põe uma hora, não 24. As **14** linhas
de story que existem no banco estão **todas vencidas**, inclusive a da Ana
Gouveia de ontem, que venceu à 01h18. A Ju reclamou às 10h. Ana posta, uma hora
depois não existe mais para ninguém, nem para ela. É a explicação mais simples
e cobre o relato inteiro. **Isto é decisão de produto da Ju, não bug** — a
política do banco aceita até 24h, quem decide 1 hora é o código.

**2. Não era visibilidade.** Conferido: a Ju é amizade aceita da Ana Gouveia
**e** a segue, então `can_view_story` passa. Mas vale saber que **a Ju segue
exatamente 1 pessoa** entre 51 contas, e story de audiência "todos" só aparece
para quem segue a autora ou já é amizade. Para o resto da base, a maioria dos
stories é invisível. É o item 3 e está com a Ju.

Um detalhe para ela decidir: existem **duas contas "Ana Gouveia"**. Se a Ana
postar da outra, a Ju não vê — ela é amiga/seguidora de uma só.

**3. O caso de 01/11 (linha sem arquivo) tinha causa, e era minha.** `remove()`
apagava o **arquivo** primeiro e a linha depois. Falhando no meio — permissão,
rede, aba fechada — o arquivo ia e a linha ficava, e `soComLink` esconde em
silêncio todo story cujo arquivo não gera endereço: assinatura exata do relato.
Invertido: a linha sai antes, e falhar deixa no máximo um arquivo órfão que
ninguém vê. Com teste.

**O que não causa isso:** `purge_expired_stories()` apaga **só linhas**, nunca
objetos do balde, e não existe `pg_cron` nem rotina agendada neste banco. O que
existe é o contrário — um **vazamento**: as linhas vencidas somem e os arquivos
ficam no balde para sempre. Não quebra nada hoje, mas cresce. Deixo na fila.

Sobre a fita mostrar "indisponível" em vez de esconder: eu **não** mudaria
agora. Com o prazo de 1 hora sendo a causa provável, "indisponível" apareceria
em todo story vencido e pareceria app quebrado. Se a Ju esticar o prazo e o
sintoma voltar, aí vale.

---

## Item 5 — os avisos "entrou na tribo": **o gatilho funciona; o push nunca foi ligado**

Conferido em produção:

- O gatilho `aviso_entrou` está instalado e **funciona**: existem **80**
  notificações `kind='entrou_na_tribo'` no banco. O sino está sendo alimentado.
- `push_subscriptions` tem **zero linhas**. Nenhuma conta, nem a da Ju, jamais
  ligou os avisos — nem depois da correção de 06/11 que tornou o botão
  alcançável.
- `pg_net` está instalado; `push_config` e `push_envios` existem.

Então ela está certa: ela espera aviso no celular e não recebe. Mas não é bug
novo — é que ninguém apertou o botão. Ou o botão está falhando calado, e aí só
o celular dela diz. Está com ela: **Configurações → Privacidade, com o app na
tela de início** (no iPhone a Apple só permite instalado).

Item 5d (avisar admins/mods, não só a criadora) está com a Ju.

---

## Item 4 — figurinha criada em conversa real: **na fila, e preciso de uma coisa**

Vou fazer a migração (`direct_messages.sticker_path`, e o mesmo em
`teia_messages`), a função de subida para o balde `stickers` e os testes.

O que eu preciso de você antes: **o webp que o criador gera chega como `File`,
`Blob` ou data URL, e com que dimensão e peso?** A assinatura da função depende
disso, e eu prefiro combinar agora a trocar duas vezes.

---

## Item 6 — foto obrigatória no banco: **minha recomendação é não**

Trigger impedindo limpar `avatar_url` depois de definido significa que a pessoa
não pode mais **tirar** a própria foto. Numa rede de amizade isso é o tipo de
trava que vira reclamação séria: alguém põe foto, se arrepende, e o app não
deixa desfazer. O portão de foto para conta nova que você já fez resolve o
problema real (conta sem foto não circula) sem essa consequência. Se a Ju quiser
endurecer, o caminho é o lembrete que você fez, não o banco.
