<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Demo modes keep the browser-local demo-state provider; real accounts (people and businesses) use Lovable Cloud with RLS, and admin rights come only from the user_roles table checked server-side.
- Keep each content screen in a dedicated TanStack route with unique metadata and shared navigation; this makes every screen directly navigable.
- Preserve the supplied SVG art through reusable avatar, icon and sticker components, using global semantic color tokens for fidelity.

- Keep demo access in a separate browser-only session provider; persist only simulated email/session flags, never passwords, and never use it as real authorization.
- Use native modal dialogs for bottom sheets so keyboard focus and dismissal stay accessible.
- Use a shared fixed header, five-slot bottom navigation and native dialogs for secondary navigation and creation; this keeps primary journeys directly accessible.
- Keep the social shell session-aware and leave entry/legal/help routes public; private data handlers continue enforcing their own existing server authentication.
- Teia membership and group chat for real accounts live in teia_members/teia_messages (RLS: members only, Realtime) via src/lib/shared-teias.ts; demo mode keeps browser-local helpers in src/lib/teias.ts.
- Validate short signup through src/lib/nommi-access.ts and populate existing profile fields after authentication; birth date remains Auth metadata because the profile schema has no birth-date column.
- Host-only frontend affordances use the authenticated profile flag, not demo session flags; this controls presentation without changing existing server authorization.
- New accounts start from emptyState; demo mode loads demoState. Daily-routine rules (greeting, question of the day, pending bell, awaiting reply) live in src/lib/today.ts so they stay testable.
- Profile visibility (public/private) lives in DemoState and listings filter private people via one shared helper so future search reuses it.
- Keep the chat sticker catalogue and tray in focused reusable modules; both private and group chats share browser-local favorites, recents, and message timestamps.
- No MCP server: the public demo catalog server was removed; reintroduce only with authenticated access once real accounts exist.
- The AI opener endpoint applies a best-effort in-memory rate limit (per IP and global daily cap); it is not durable across worker instances.
- Radar rules (places, nearest public place, approximate distance, privacy filter) live in src/lib/radar.ts; device coordinates are never persisted. Partner meetup ideas use a server function with the same best-effort in-memory rate limit as openers.

- Credit balances change only through security-definer database functions (admin adjust, boost spend) that write the ledger; clients never write balances directly.
- Real credit purchases use embedded card checkout; balances change only in the payment webhook via the idempotent grant_purchased_credits function (keyed by checkout session), so a client can never add credits itself.

- Keep the visual reward catalogue in a focused module; it reads existing published host ideas without modifying payment or reward-balance rules.
- Real-account teias and open rolês live in the teias table (table reads limited to creator/members; discovery via the list_teias() function that hides who created it; creator writes) via src/lib/real-teias.ts; ids start at 100000 so they never collide with demo teias.
- Real-account profile edits, photo (resized data URL in profiles.avatar_url, since public storage buckets are blocked) and people search live in src/lib/real-profiles.ts; public profiles are at /nommi/$id.

- Keep the community presentation in community-detail.tsx; GroupDetail owns existing membership, chat and challenges so visual redesigns do not replace real-account flows.
- Posts, reações, comentários e mídia vivem em public.posts/post_media/post_reactions/post_comments; a visibilidade passa pela função can_view_post (membro da teia, seguidor ou amizade) e os arquivos ficam no bucket privado post-media (caminho começa pelo id de quem envia). Use src/lib/posts.ts.
- Seguidores (public.follows) e os números do perfil (função profile_stats) estão em src/lib/follows.ts; cada pessoa pode esconder as próprias contagens com profiles.show_counts e não existe ranking nem lista de "mais seguidos".
- Rolês com data (teias.starts_at), vagas (teias.capacity) e "Quero ir" (public.teia_rsvps) estão em src/lib/roles.ts; list_teias devolve going_count e i_am_going, e a regra do banco recusa rolê lotado ou que já passou.
- O mural "Meus amigos dizem" (public.wall_items) só aceita texto de quem já é amizade; o status nasce no servidor por gatilho e só a dona do perfil aprova. Use src/lib/wall.ts.
- Bloqueio (public.blocks, nos dois sentidos) e denúncias (public.reports, lidas só por admin) estão em src/lib/safety.ts; is_blocked_between corta perfis, posts, rolês e pedidos de conexão.
- O site é instalável (manifesto em public/manifest.webmanifest, ícones em public/icon-*.png e apple-touch-icon.png); o convite para adicionar à tela de início vive em install-banner.tsx com as regras testáveis em src/lib/install.ts.
- Stories (public.stories/story_views, bucket privado stories) vivem em src/lib/stories.ts e aparecem na fita do Início via stories-strip.tsx; somem sozinhos em 24 h e a regra can_view_story segue amizades e seguidores.
- Capas e planos de fundo (profiles.cover_path/background_path, teias.cover_path/background_path, bucket público covers) estão em src/lib/covers.ts e no componente cover-editor.tsx; há também fundos prontos sem upload.
- O Radar nommi é global: a posição vai arredondada para ~1 km (coarse) e quem está por perto vem da função radar_nearby, que devolve distância e nunca coordenadas. A política de privacidade em settings.tsx descreve isso.
- A letra do logo é Baloo 2 800, embutida em public/fonts/baloo2-*.woff2 e declarada no fim de styles.css; não depende do Google Fonts e é pré-carregada em __root.tsx. Os ícones do app em public/icon-*.png são gerados com essa mesma letra.
- O nome visível do grupo é "tribo"; no banco, no código interno e nas rotas tudo continua "teia" (tabelas teias/teia_members/teia_messages/teia_rsvps, rota /grupos, ícone teia, chave de visibilidade teia). Trocar esses nomes quebraria dados já gravados.
- A assinatura da marca fica em TAGLINE, em surfaces.tsx: "Encontre sua tribo".
- A conversa a sós entre contas reais vive em public.direct_messages (RLS: só entre amizades aceitas via sao_amigos, bloqueio corta; só quem recebe marca read_at) com Realtime; as funções minhas_conversas() e nao_lidas() alimentam a lista e o aviso da navegação. Código em src/lib/direct-messages.ts e nos componentes direct-chat.tsx e direct-chat-page.tsx; a rota é /conversas/$id.
- "Só entre nós" são posts com secret=true e expires_at (máx. 30 dias) numa tribo: só membros veem, e o post some para todos quando vence (can_view_post confere o prazo). Código em src/lib/secrets.ts e no componente tribe-secrets.tsx, como aba da tribo.
- Tribos oficiais da nommi: teias.official (só admin marca, via gatilho teias_oficial_so_admin), com about e rule; list_teias devolve about, rule, official, member_count e i_am_member, assina a oficial como "nommi" e coloca as oficiais primeiro. Dez tribos oficiais já existem no banco.
- teias.audience ("todos" ou "mulheres") é rótulo visível, não trava de entrada: o app não coleta nem verifica gênero. A moderação é que sustenta o espaço: quem criou a tribo e a administração podem remover alguém (policies em teia_members) e a remoção fica em public.teia_removals, que impede a pessoa de entrar de novo até alguém desfazer.
- teias.who_posts ("todos" ou "criadora") controla quem escreve na tribo: a função pode_falar_na_tribo governa posts e teia_messages, e list_teias devolve who_posts, i_can_post e i_am_creator.
- No "Só entre nós" existe posts.anonymous (só com secret=true): a função segredos_da_tribo esconde quem escreveu da tribo e mostra "Alguém da tribo", mas o author_id continua gravado para moderação. A tela traz marca d água com o apelido de quem lê, porque bloquear print é impossível na web.
- As telas de entrada e cadastro usam o fundo do Rio com véu escuro (classes com-cenario/cenario-fundo em social-shell.tsx).
- A página pessoal (src/components/friends/my-nommi.tsx) é o que /perfil mostra para contas reais; os dados vêm da função pagina_pessoal(), que devolve também as tribos em comum com quem está olhando. Campos próprios dela: profiles.places, looking_for, instagram (não verificado) e person_verified (só por fora: a permissão de UPDATE em profiles é por coluna e não inclui person_verified).
- A chegada (src/components/friends/chegada.tsx) é o que o Início mostra para quem ainda não entrou em nenhuma tribo: explica a nommi em três passos, sugere tribos por interesse (função tribos_para_mim) e dá o convite para WhatsApp. Números na tela vêm de pulso_da_nommi e são reais; nunca inventar gente, tribo cheia ou atividade.
- teias.goal é a meta de abertura da tribo ("faltam X para a primeira roda"): barra e frase saem de faseDaTribo em src/lib/chegada.ts.
- Convites ficam em public.invites; usar um convite passa pela função usar_convite(), porque ninguém deve enxergar código alheio.
- Paleta: as variáveis em styles.css apontam para a marca — --primary #007E46, --teal/--blue #075E3B, --sunshine #FFB400, --butter #F7F0DE, --background #FAF9F6, --foreground #2E2E2E, --coral #EF675A só para alerta e --erro #B3261E para erro. Não introduzir cor nova fora dessa lista.
- Fontes: Baloo 2 (logo e títulos, embutida em public/fonts) e DM Sans (texto); Caveat só na assinatura do logo. Bricolage Grotesque foi removida.
- Toque: nenhum botão abaixo de 44 px de altura.
- Navegação: Início · Descobrir · + · Tribos · Meu nommi; Conversas fica no cabeçalho com o contador; Radar, Rolês, Meus amigos e Clube no menu lateral. Toda tela nova precisa de uma porta de entrada: rota sem link é funcionalidade invisível.
- Avisos: public.notifications é escrita só por gatilhos no banco (função avisar(), SECURITY DEFINER, que respeita bloqueio e nunca avisa a própria pessoa). A pessoa só lê, marca como lida e apaga. Gatilhos em connections, post_comments, post_reactions, wall_items, teia_members e teia_rsvps. Código em src/lib/avisos.ts, tela em avisos.tsx, sino no cabeçalho, rota /notificacoes.
- Ciclo da estrela: attendances (declaro que estive) + confirmar_presenca() (quem organizou, ou quem já teve presença confirmada, confirma outra pessoa) + creditar_estrela() escrevem star_accounts e star_ledger. O navegador NUNCA escreve saldo nem histórico: só lê. Teto de 3 estrelas por semana (pode_ganhar_estrela) e conta precisa ter 3 dias. Janela de 7 dias depois do rolê. Código em src/lib/presenca.ts e no componente presenca.tsx, dentro da aba Eventos do rolê.

## Moderação (0023)
- `fila_de_moderacao(_status)`, `resumo_da_moderacao()` e `moderar_post(_post, _remover)` só respondem para `has_role(auth.uid(),'admin')`; a fila vem com `denuncias_contra` (quantas denúncias já existem contra a mesma pessoa).
- A ordem da fila é decidida no cliente por `urgencia()` em `src/lib/moderacao.ts`: assédio e encontro inseguro são sempre altos, reincidência sobe o grau. Mexer na regra é mexer nessa função, não na SQL.
- Anonimato em "Só entre nós" esconde o autor da tribo, nunca da moderação: `posts.author_id` continua gravado e aparece aqui.
- A fila mora na aba "Denúncias" do painel `/admin` (primeira aba, porque é a que não pode esperar).

## Combinar / match (0024)
- `pessoas_para_combinar()` monta o baralho; a ordem é: quem já me curtiu primeiro, depois afinidade (interesse em comum vale 2, objetivo 1, mesma cidade 1). Perfil privado, empresa e quem já é amizade ficam fora.
- `responder_pessoa(_para, _sim)` devolve 'match', 'guardado', 'passou' ou 'erro'. A resposta é privada: só o match avisa alguém. Não existe GRANT de INSERT em `curtidas` — tudo passa pela função.
- Pedido de amizade pendente conta como sim do outro lado: dizer sim aceita o pedido e vira match.
- `quem_tem_curiosidade()` devolve só o número de quem me escolheu e ainda não respondi. Número real, nunca o nome — é o que puxa a pessoa para o baralho sem expor ninguém.
- Afinidade nunca vira porcentagem na tela: `porqueApareceu()` diz o motivo em palavras ou admite que a pessoa é nova.

## Enquadrar foto e capa (0025)
- O enquadramento é guardado como dois números (0 a 100) em `cover_x/cover_y` e `avatar_x/avatar_y`, nunca como texto de CSS: o que entra numa regra de estilo tem que ser número validado no banco.
- `limite()` em `src/lib/enquadrar.ts` é o único lugar que converte para `%`. Nada mais escreve `background-position` ou `object-position` a partir de dado do banco.
- Colunas novas em profiles precisam entrar no GRANT UPDATE por coluna de 0025, senão não salvam (a permissão por tabela abriria person_verified junto).
- Capa com `position:relative` pinta por cima de bloco estático mesmo vindo antes no HTML: todo topo que sobe por cima de capa precisa de `position:relative;z-index:1`.
- Os "primeiros passos" (Chegada) não tomam mais a tela inteira: viram cartão na página inicial e somem quando a pessoa fecha, lembrado por aparelho em `src/lib/chegada-vista.ts`.

## Tour guiado (sem migração)
- Os passos ficam em `PASSOS_DO_TOUR` (`src/lib/tour.ts`) e apontam para `[data-tour="..."]`. Para incluir uma tela no tour, basta pôr o `data-tour` no elemento — passo cujo alvo não está na tela é pulado sozinho, nunca mostra balão vazio.
- O tour só começa na página inicial (é onde os alvos existem) e só para conta real, 900ms depois de abrir.
- "Fazer o tour do app" no menu lateral reinicia quando a pessoa quiser; Esc, "Pular" e tocar fora encerram.
- Fica lembrado por aparelho (localStorage), não na conta: é preferência de tela.

## Contas de teste (0026) e interesse sem maiúscula (0027)
- `is_test` em profiles e teias marca o que existe só para a equipe ver tela cheia. Toda função nova que liste gente ou tribo precisa repetir `(NOT is_test OR public.ve_contas_de_teste())` — a trava é no banco, não na tela. Detalhes em `scripts/contas-de-teste.md`.
- Isso não é prova social falsa: pessoa real nunca vê conta de teste, e `pulso_da_nommi()` não conta quem é de teste.
- Interesse em comum compara com `lower()`: "música" e "Música" são o mesmo interesse. A tela mostra a grafia de quem escreveu.

## Fundo de teia, figurinhas e o match por afinidade (0028)
- `background_path` guardava o fundo mas **nada o desenhava** — era um ajuste que não fazia nada. Agora pinta a página da pessoa e viaja no baralho: é o fundo dela que aparece atrás dela no match.
- O fundo nunca é texto de CSS vindo do banco: o banco guarda um id (`teia-mata`, `teia-papel`…), conferido contra `FUNDOS` em `src/lib/fundos.ts`. Id desconhecido não vira estilo nenhum.
- `tomDoFundo()` decide se o texto é claro ou escuro. Fundo novo precisa declarar o tom, senão o texto some.
- Interesse vira figurinha por `figurinhaDe()` (`src/lib/figurinhas.ts`), que sempre devolve algo: catálogo, depois pistas por palavra, depois ✨. O dado guardado continua sendo o nome, então interesse escrito à mão continua combinando.
- Interesses agora se editam em Meu nommi, até 12 — o limite de 3 é só do cadastro. Quanto mais interesses, melhor a fila.
- Estar na mesma tribo conta afinidade no baralho (`tribos_em_comum`).

## Peso por raridade e selos (0029)
- `peso_dos_interesses()` dá a cada interesse `ln(1 + total de pessoas / quantas marcaram)`: comum pesa pouco, raro pesa muito, nada zera. Conta só gente real — conta de teste não mexe na régua.
- A afinidade do baralho é: soma dos pesos dos interesses em comum ×10, objetivo ×3, mesma cidade ×4, cada tribo junta ×6, cada selo em comum ×5. `em_comum` sai ordenado do mais raro para o mais comum, porque é o raro que explica o encontro.
- `selos` é o que os amigos dizem de alguém. Só amizade aceita carimba (`pode_selar`), e `selos_do_perfil()` devolve só o selo e quantos deram — **nunca quem deu**. Quem deu pode tirar; o dono da página também, porque a página é dele.
- Selo é sobre como a pessoa é, nunca sobre aparência: o catálogo em `src/lib/selos.ts` é fechado e tem teste que barra palavra de aparência.

## Story é agora (câmera, 1 hora, filtros)
- Story se tira na câmera do app (`camera-story.tsx`), não se escolhe da galeria. Isso também resolveu o bug do iPhone: foto de iPhone chega em HEIC e era recusada; a câmera entrega JPEG do canvas, sempre.
- Vale 1 hora (`venceEm()` em `src/lib/camera.ts`), gravado no insert. A política do banco aceita até 24h, então o prazo é decidido aqui.
- Filtro é id conferido contra `FILTROS`; o CSS nunca vem de fora. Tem teste que barra filtro com `url(` ou `;` entrar na lista.
- Câmera da frente aparece espelhada para quem está tirando e sai desespelhada para quem vê — é o que todo app faz, e o contrário assusta.
- Filtro de rosto (orelhinha, deformar o rosto) **não** existe: precisa de rastreamento facial, é outra ordem de trabalho.

## Endereço de imagem (bug de 23/10)
- `enderecoDaImagem()` em `covers.ts` é o único lugar que decide se um valor é endereço pronto (`http`, `data:`, `blob:`) ou caminho no armazenamento. Valor sem `/` nunca vira URL — era o que quebrava a moldura de ajuste (foto salva como `data:`) e o fundo (id antigo `teia-verde` virando URL).

## Versão nova (bug da Ana, 26/10)
- O app é uma página só e não tem service worker. Quem põe a nommi na tela de início fica com ela aberta por dias: a Ana testou uma correção que já estava publicada e viu a tela velha.
- `vite.config.ts` carimba cada build em `__NOMMI_VERSAO__` e grava `public/versao.json`. `useVersaoNova()` compara ao abrir, ao voltar para o app e a cada 10 min, e a barra oferece atualizar. Build novo = carimbo novo; não mexer num sem o outro.

## Foto e vídeo que o celular manda (26/10)
- Foto de iPhone chega em HEIC e as novas passam de 2 MB. A tela de perfil aceitava só JPG/PNG/WebP até 2 MB e recusava — `resizePhoto()` já resolvia os dois casos pelo canvas, o que barrava era a conferência antes dela. Regra: conferir só se é imagem e um teto generoso; o canvas decide o resto.
- Vídeo da galeria de iPhone é .mov e não toca no Android. Por isso o story grava o vídeo na própria câmera (`MediaRecorder` com o formato que `formatoDeGravacao()` encontra): o formato que o navegador grava é o que ele sabe tocar.

## Tribo aberta ou fechada (0030)
- `teias.entrada` é 'aberta' ou 'fechada'. A política de INSERT em `teia_members` confere `tribo_e_aberta()`: em tribo fechada ninguém entra sozinho, nem pelo cliente.
- Pedido vira participação só por `responder_pedido()`, que confere se quem responde é a criadora.
- `portaDaTribo()` em `src/lib/porta-da-tribo.ts` é o único lugar que decide o que o botão diz. Tela nova que mostre tribo usa essa função, não um `if` próprio.

## Instantâneo, não robotizado (28/10)
- Foto se escolhe e **aparece na hora**: `FotoInstantanea` abre a imagem com `URL.createObjectURL` (o navegador já tem o arquivo, não precisa de servidor), deixa enquadrar ali e só depois envia, em segundo plano. Nunca mais "escolhe, espera, descobre que não deu".
- A conta do recorte vive em `src/lib/foto.ts`: `prenderNaMoldura()` impede buraco na moldura e `pedacoDaFoto()` devolve o recorte em coordenadas da imagem. Tela nova que recorte foto usa essas funções.
- Espera é `<Esqueleto>` com a forma do que vem, nunca "Carregando…" escrito. Texto cinza no meio da tela é o que mais faz o app parecer máquina.

## Tribo não é encontro esperando acontecer (28/10)
- Decisão da Ju: muita gente entra numa tribo só para conversar e fazer amizade; marcar rolê é opcional. O match é o outro caminho da amizade, e vale sozinho.
- Por isso `faseDaTribo()` diz quem está lá ("5 pessoas aqui"), nunca o que falta para marcar. A meta da tribo, quando existe, entra como convite, nunca como pendência. Tem teste que barra as palavras "roda", "encontro" e "marcar" voltarem para essa frase.
- A chegada explica os dois caminhos — match e conversa na tribo — e põe o rolê como "quando der vontade".

## Sem foto não é foto de outra pessoa (Felipe, 26/10)
- O padrão de quem não tem foto era `<Avatar id={3} />`, que desenha a **dani**, uma pessoa real do conjunto da apresentação. O Felipe criou conta e viu o rosto de uma desconhecida no perfil dele.
- Agora é `<SemFoto nome={...} />`: inicial da pessoa, cor sempre a mesma para o mesmo nome, e um desenho neutro quando não há nome. `personPhoto` só pode ser usado para gente da apresentação, nunca como padrão de conta real.
- Contraste: dentro de `.cenario-conteudo` (cadastro sobre a foto do Rio), chip branco herdava texto claro e sumia. As regras de chip agora são explícitas ali.

## Painel de números (0031)
- `acessos` guarda **uma linha por pessoa por dia**, e só isso: nada de tela, clique ou lugar. É o mínimo para responder "quantas voltaram". `registrar_acesso()` é chamada quando conta real abre o app.
- `painel_de_numeros()` e `acessos_por_dia()` só respondem para admin, e **nenhuma conta de teste entra na contagem**.
- `oQueOsNumerosDizem()` em `src/lib/numeros.ts` lê os números e diz qual é o gargalo. Tem teste que barra a frase virar elogio: cadastro não é sucesso.
- A privacidade do app precisa dizer que o dia de acesso é guardado — ainda é texto de demonstração.

## Bonequinho (0032)
- Quem não põe foto escolhe um bonequinho: mulher, homem ou prefiro não dizer. É **escolha de desenho**, guardada em `avatar_figura` — não é cadastro de gênero e não entra em filtro nem no match. Se um dia precisar de gênero para regra de tribo, é outro campo e outra conversa.
- Sem bonequinho escolhido, aparece a inicial. Em nenhum caso aparece foto de outra pessoa.

## Vídeo no perfil (0033)
- Dois vídeos: o da própria pessoa (`profiles.video_path`) e os dos amigos falando dela (`videos_amigos`).
- Regra que não se mexe: **vídeo de alguém sobre você não entra na sua página sem você deixar**. Só amizade aceita grava (`sao_amigos`), entra como `pendente`, e só o dono muda para `no_ar`. Quem gravou pode tirar o seu; o dono pode tirar qualquer um.
- O balde `videos` é fechado: o endereço é assinado por 1 hora (`enderecoDoVideo`).
- O vídeo é gravado na câmera do app, no formato que `formatoDeGravacao()` encontra — mesmo motivo do story: o que o navegador grava é o que ele toca.

## Consentimento, idade e apagar a conta (0034)
- A política de privacidade **não é mais texto de demonstração**. O que ela afirma tem que ser verdade: há teste (`src/test/politica.test.ts`) que lê o próprio arquivo e barra "fica neste navegador", "dados locais" e a palavra "demonstração" no texto legal.
- Quem responde pelos dados mora num lugar só, `src/lib/politica.ts` (`RESPONSAVEL`). Enquanto o CNPJ da nommi não sai, `tipo: "em_registro"` e o texto admite isso em vez de inventar um nome. Quando sair: preencher `nome`/`documento`, trocar para `"empresa"` e subir `VERSAO_DOS_TEXTOS`.
- `VERSAO_DOS_TEXTOS` é o que fica gravado no aceite de cada pessoa. **Mudar o texto sem mudar a versão é mentir no registro**; mudar a versão faz todo mundo ver o aviso de novo, que é o que a própria política promete ("avisa dentro do app antes de valer").
- `aceites` guarda a prova (quem, qual documento, qual versão, quando). Não existe INSERT direto: só `registrar_aceite()`, porque a data tem que ser do servidor.
- A trava de 18 anos saiu da tela e foi para o banco: `profiles.nascimento` + gatilho `confere_idade`. A data que já estava no cadastro (metadado do Auth) é copiada para lá na primeira visita, em `useAceite`.
- Tribo sensível (`teias.sensivel`): política, religião, orientação. A política de INSERT em `teia_members` confere `posso_entrar_na_tribo()`, então **a trava é do banco** — não adianta a tela esquecer. `portaDaTribo()` ganhou o estado `"consentir"`, que vem antes de aberta/fechada.
- `apagar_minha_conta()` apaga de verdade, na hora, sem período de arrependimento — menos dado guardado é menos risco, e o texto promete isso. Fica de pé só a denúncia feita **contra** quem saiu, porque ela protege quem denunciou.
- `meus_dados()` devolve tudo num JSON. Tabela nova com dado de pessoa precisa entrar nas duas funções: a que apaga e a que exporta. Esquecer uma delas é descumprir o texto que está no ar.

## Seguir, quem viu, e senha (0035)
- `follows` ficou sem gatilho desde que nasceu: seguir alguém **não avisava ninguém**. Agora `aviso_seguidor` avisa, e `notifications.kind` ganhou `'seguidor'`. Gatilho novo em tabela de relacionamento é fácil de esquecer: a lista de gatilhos está em AGENTS, conferir ao criar tabela.
- `quem_eu_sigo()`, `quem_me_segue()` e `quem_viu_meu_story()` são do dono e de mais ninguém: seguidor alheio não é vitrine, e quem viu um story só aparece para quem postou.
- `meus_dados()` esquecia `follows`. Regra que vale para sempre: tabela nova com dado de pessoa entra nas duas funções, a que apaga e a que exporta, no mesmo commit.
- Recuperação de senha existe de verdade (`/recuperar-senha`, `src/lib/senha.ts`). Antes a rota só mostrava o login de novo e quem esquecia a senha ficava trancado para fora. O recado de "mandamos o link" é **o mesmo com e-mail cadastrado ou não**, de propósito: dizer "esse e-mail não existe" entrega quem tem conta na nommi.

## O fundo que não pintava (29/10)
- `.mynommi>*{position:relative;z-index:1}` vinha **depois** de `.mynommi-fundo{position:absolute}` com a mesma força, então devolvia a camada do fundo para o fluxo. Div vazio relativo tem altura zero: o fundo era salvo, lido e desenhado, e não aparecia.
- Agora a regra é `.mynommi>*:not(.mynommi-fundo)`, e tem teste que lê o CSS e barra a volta.
- `background-attachment: fixed` saiu de `estiloDoFundo`: o Safari do iPhone não desenha, e o fundo some justamente no aparelho onde a nommi mais é usada.

## Galeria, salvar e o disparo que sumia (Ana, 29/10)
- O disparo era branco com anel coral sobre a folha branca da gaveta: lia como "botão sumindo". Agora é branco com anel verde da marca **mais** um anel escuro de contorno. Botão redondo claro sobre fundo claro precisa de contorno próprio, não só de cor.
- O story aceita foto da galeria, pelo mesmo canvas da câmera: é o canvas que converte o HEIC do iPhone e aplica o filtro escolhido. **Vídeo da galeria continua de fora de propósito** — o .mov do iPhone não toca no Android, e gravar aqui garante o formato.
- Foto da galeria nunca é espelhada: espelho é coisa de câmera frontal, não de arquivo.
- "Salvar no celular" baixa o resultado com filtro aplicado (`nomeDoStory()`), para usar em outra rede.

## Contraste: superfície clara dentro de página escura (Ana, 29/10)
- `.fig` (figurinha de interesse) tinha fundo claro e **não declarava cor de texto**: dentro de `.tom-escuro`, a página de quem escolheu fundo escuro, herdava o claro e ficava branco no branco, ilegível até ser clicada.
- Regra geral: **toda superfície clara declara a própria cor de texto**. Há teste em `src/test/contraste.test.ts` que confere `.fig`, o chip do cadastro sobre a foto do Rio, e o disparo da câmera.
- Ao escrever uma regra escopada em `.tom-escuro`, lembrar do estado selecionado: `.tom-escuro .fig` tem a mesma força de `.fig.marcada` e, vindo depois, apagava o branco da escolhida. Por isso `.tom-escuro .fig.marcada` existe logo em seguida.
- `.friends-app button` zera `box-shadow` com força maior que uma classe sozinha. Contorno de botão precisa vir como `.friends-app .camera-disparo`, senão some.
- Para tirar prova em tamanho de celular sem o app autenticado: `npx vite dev --host 127.0.0.1 --port 8080` e uma página de harness que carrega `http://127.0.0.1:8080/src/styles.css` com o próprio reset de `box-sizing`, renderizada pelo chromium do sistema (`/opt/npm-tools/node_modules/playwright`). O container não alcança o site publicado: a rede sai por lista de permissão.

## Filtros de beleza: cor é CSS, pele é canvas (29/10)
- Dois mecanismos, de propósito. **Cor e luz** saem de `filter` de CSS: instantâneo, serve para a prévia ao vivo. **Pele suave** não tem como sair de CSS: `blur()` borra olho, cílio e boca junto, que é o que dá cara de filtro ruim.
- A conta da pele está em `src/lib/beleza.ts`. `misturarSuavidade()` compara a foto nítida com a borrada ponto a ponto e **só troca pelo borrado onde os dois já estavam perto** — onde há detalhe de verdade, o original fica. Tem rampa perto do limiar, senão aparece borda dura em volta dos olhos.
- `forcaDaSuavidade()` nunca chega a 1: mistura 100% vira plástico.
- A suavidade roda **depois** do corte para o tamanho de publicação, não sobre o quadro gigante da câmera: é onde o custo é aceitável no celular.
- `FILTROS` ganhou `suavidade` por filtro. Filtro de beleza pede pele; filtro divertido não. Teste barra `blur(` voltar para o CSS de qualquer filtro.
- "Meu filtro" é montado com controles e guardado no aparelho (`localStorage`), porque é preferência de tela. O CSS dele é montado **só com números conferidos** por `ajustesParaCss()`; tem teste que tenta injetar `url(` e `;` pelos controles.
- O que **não** existe: afinar rosto, mudar nariz. Isso precisa de rastreamento de pontos do rosto (MediaPipe ou equivalente), que é outra ordem de trabalho: modelo para baixar, orçamento de desempenho no celular e teste em aparelho de verdade.

## Suas tribos no Início (0036)
- O Início mostrava "Tribos para você", que é descoberta. Quem já está dentro quer o contrário: ver as suas, saber onde tem recado novo e entrar. Agora `MinhasTribos` vem primeiro e a descoberta virou "Para você conhecer", embaixo.
- `tribo_vista` guarda **uma linha por pessoa por tribo** com a hora da última visita. É o mínimo para responder "o que é novo". `marcar_tribo_vista()` é chamada ao abrir a tribo.
- `minhas_tribos()` devolve a última fala, quem falou, quando e quantas não lidas. **A própria fala da pessoa nunca conta como não lida.** Tribo com recado novo vem primeiro na ordem.
- `recadoDaTribo()` é o único lugar que decide a frase da linha, e tem teste barrando "marcar", "roda" e "encontro": tribo não é encontro esperando acontecer, aqui também não.

## Lembranças: o álbum no lugar do exemplo (0037)
- O Início mostrava rolês de exemplo da apresentação para conta real, no lugar mais nobre da tela. Decisão da Ju: ali é o álbum da pessoa.
- `meus_roles_vividos()` devolve os rolês em que a pessoa declarou presença, ou disse "quero ir" num rolê que já passou, com a última foto publicada naquele rolê e com quem ela foi (de `attendances`).
- `lembrancas` guarda a escolha da pessoa: a foto fixada e uma frase dela ("fui com a tribo do karaokê"). A frase vence a foto automática.
- A apresentação continua com os cartões de exemplo; conta real nunca mais vê exemplo nessa faixa.
- `tribo_vista` e `lembrancas` entraram em `meus_dados()` e em `apagar_minha_conta()` no mesmo commit, como manda a regra.

## Story no ar aparece (29/10)
- A bolinha do próprio story não dizia nada quando havia story no ar. Agora o anel ganha `viva`: gira devagar e pulsa, e tocar abre o story em vez de abrir a câmera. O `+` virou botão separado, no canto.
- Story de outra pessoa ainda não visto também pulsa; visto fica cinza.
- A animação respeita `prefers-reduced-motion`.

## Explicação na hora certa (sem migração)
- O tour mostra **onde** ficam as coisas. `src/lib/primeira-vez.ts` explica **o que faz e por quê**, no momento em que a pessoa abre cada tela, e some depois de lida.
- Fica por aparelho (`localStorage`), igual ao tour: é preferência de tela, não dado de conta.
- Texto novo entra em `EXPLICACOES` com uma chave; a tela só chama pela chave.

## Plano de fundo: quatro gavetas, 33 opções (29/10)
- "Meu fundo" virou **"Plano de fundo"**, e o seletor é por gaveta: Teia, Degradê, Tie-dye e Estampa.
- `desenhoDoFundo(f)` desenha cada estampa em SVG com as três cores do fundo (`base`, `linha`, `no`). SVG porque é leve, não depende de arquivo e fica nítido em qualquer tela. Estampa nova = um `desenho` novo no switch, nunca uma imagem solta.
- Os ids `teia-*` continuam existindo com o mesmo nome: quem já escolheu um deles não pode perder o fundo. Tem teste que exige o prefixo nos fundos do grupo Teia.
- Fundo novo **precisa declarar o tom**, senão o texto da página some. Teste confere.

## Rastreamento de rosto (29/10, em construção)
- `src/lib/rosto.ts` acha os 468 pontos do rosto para destravar maquiagem, olhos e contorno. Roda **dentro do celular**: a foto não vai para servidor nenhum.
- A biblioteca vem do **CDN**, com `import(/* @vite-ignore */ ENDERECO_BIBLIOTECA)`, e não como dependência. Dois motivos: o build da Lovable usa `bun` com lockfile travado e não dá para sincronizar daqui, e são 43 MB que não têm por que entrar na árvore por um recurso opcional.
- **Nada carrega sozinho.** O modelo é um arquivo que o aparelho baixa; só quando a pessoa liga a maquiagem. Se falhar, `carregarRosto()` devolve null e a câmera segue com os filtros de cor, sem quebrar.
- Toda a conta é função pura com teste: quais índices são boca, olho e mandíbula; para onde cada ponto anda ao afinar; como o empurrão some longe das âncoras. Só carregar e desenhar tocam no navegador.
- `deslocamentoDoAfinar` tem teto de 5,5% da largura do rosto, e quem está junto do queixo anda menos. Mão pesada aqui vira desenho animado.
- `MANDIBULA` é só a parte de baixo do contorno, de propósito: mexer na testa deforma o rosto.
- **Não testável aqui**: este ambiente não tem câmera nem rosto, e a rede não alcança o modelo. A primeira prova é no celular da Ju.

## O login que falhava pelo WhatsApp (30/10)
- Uma amiga da Ana tentou entrar e recebeu "Authorization failed / Missing state parameter", numa tela da Lovable. O erro é do servidor de login, não do app.
- Causa: o login do Google guarda uma chave no navegador antes de sair e confere na volta. **Navegador guarda por endereço.** Começar num endereço e voltar noutro perde a chave. Três jeitos de isso acontecer aqui:
  1. **Site URL desatualizado** na Lovable (Cloud → Auth → URL Configuration). Continua `nommibrasil.lovable.app` enquanto o app é servido em `nommibr.com.br`. **Só a Ju resolve**, e é a causa mais provável.
  2. `www.nommibr.com.br` e `nommibr.com.br` são endereços diferentes para o navegador. Resolvido: `irParaOEnderecoCerto()` manda o `www` para o endereço sem `www` antes de qualquer login.
  3. Janelinha embutida do WhatsApp. Resolvido: `ehNavegadorDeApp()` reconhece, esconde os botões sociais e explica como abrir no navegador, deixando o cadastro por e-mail em evidência, que funciona ali.
- A nommi cresce por link de WhatsApp: **toda mudança no login precisa ser pensada para quem chega por lá.**
- Erro de login nunca mostra código técnico para quem está entrando. Tem teste barrando `invalid_request`, `state parameter` e afins no texto.

## Foto de perfil vira arquivo (30/10)
- A foto virava **texto dentro da linha do perfil** (data URL em `profiles.avatar_url`). A maior em produção tinha 93 mil caracteres. Três problemas: viajava em toda consulta que lê perfil, falhava no salvamento com foto grande (era o bug da Ana: umas iam, outras não) e não dava para o navegador cachear.
- Agora sobe para o balde **`covers`**, que já tem a regra certa: cada pessoa escreve só dentro da própria pasta, e qualquer um lê. Foto de perfil é pública por natureza. **Não precisou de balde novo nem de migração.**
- O nome tem carimbo de tempo (`<uid>/foto-<agora>.jpg`): sem isso o celular mostra a foto velha do cache. A anterior é apagada depois que a nova salva.
- **Foto antiga continua funcionando**: `enderecoDaImagem()` já lida com as duas formas e ninguém reenvia nada.
- Se o envio do arquivo falhar, ainda tenta guardar embutido: melhor a foto feia por dentro do que a pessoa sem foto.
- A prévia e o recorte já existiam em `FotoInstantanea`; o que faltava era o destino.

## Espaço para se descrever (30/10)
- "Sobre mim" era 140 caracteres e a conta da Ju já batia 136: o campo acabava antes da frase. Agora `MAX_SOBRE` = 600, com o campo em 6 linhas. Numa rede de amizade, "sobre mim" é o que faz alguém querer conversar.
- O cadastro pedia **exatamente 3** interesses. Agora é de 3 a 6 (`INTERESSES_NO_CADASTRO`): três é o mínimo para a fila ter de onde partir, seis é onde o cadastro ainda é curto. Até 12 continuam em Meu nommi.

## A apresentação depois do cadastro (0038)
- A testadora saiu do cadastro sem entender como encontraria alguém. A apresentação é o pedaço entre "criei a conta" e "e agora?": uma pergunta por tela, barra de progresso, e no fim os três caminhos para achar gente.
- **Três regras que não se mexem**: tudo é opcional (toda etapa tem "pular" e há "deixar para depois" sempre visível); nada de íntimo (tem teste barrando estado civil, filhos, religião, renda e corpo nas perguntas); e cada pergunta diz **na própria tela** se a resposta vai para a página ou fica só nas sugestões.
- `profiles.nao_topa` é o único campo da apresentação que **não** aparece na página de ninguém: serve só para a nommi parar de sugerir o que a pessoa não gosta. Mudar isso quebra uma promessa feita na tela.
- `profiles.apresentacao` ('pendente' | 'pulou' | 'feita'): **"pulou" conta como visto.** Ninguém é cobrado duas vezes.
- Só aparece depois do aceite dos termos: duas telas por cima da outra é pior que nenhuma.
- O tour antigo continua: ele mostra **onde** ficam as coisas; a apresentação pergunta e explica **como** as pessoas se acham.

## A entrada com movimento (30/10)
- Três brilhos coloridos (verde, sunshine, coral) andam devagar atrás da foto do Rio, com desfoque grande, e o conteúdo entra em cascata. Movimento longo e lento, nunca piscando.
- Tudo respeita `prefers-reduced-motion`.
- As cores são as da marca: movimento e desfoque dão vida sem inventar cor nova.

## A porta da tribo e o convite em lote (30/10)
- Decisão registrada: **a nommi não inventa gente.** Pedido de criar perfis fictícios dentro das tribos para dar sensação de movimento foi recusado, e a recusa vale para qualquer forma do mesmo pedido. O que resolve o vazio é verdade com objetivo, e distribuição.
- `fraseDaPorta()` em `src/lib/porta-que-abre.ts` é o único lugar que escreve a frase do topo da tribo: o número **real** de membros e o que falta para a próxima porta abrir (3 = primeira conversa, 10 = primeiro rolê, 25 = Só entre nós). Tem teste exigindo que o número da frase seja o número recebido.
- A barra recomeça do zero ao cruzar cada porta: objetivo à vista em vez de barra quase cheia para sempre.
- `ConvidarEmLote` abre o WhatsApp com o convite escrito, com o nome de quem convida e, quando há tribo escolhida, quantas faltam para ela abrir. **A nommi não pede a agenda de contatos** — quem escolhe o destinatário é a pessoa, dentro do WhatsApp dela.
- O link do convite cai **dentro da tribo** (`&tribo=`), não só na porta do app.

## Embaixadora: o título de quem chegou no começo (30/10)
- Pedido da Ju: em vez de um selo enfeite, um **título com nome e número** para as primeiras, e quem tem o título tem **acesso premium** às funcionalidades que um dia serão pagas.
- `embaixadoras` guarda `user_id` + `numero` com **índice único no número**. O número nunca se repete e nunca muda de dono: título que troca de dono não é título.
- `virar_embaixadora()` **nunca remove ninguém** e usa `max(numero) + 1`, não `count(*) + 1`. Dois motivos: duas pessoas entrando no mesmo segundo receberiam o mesmo número com `count(*)`, e se alguém apagar a conta o número dela fica vazio para sempre em vez de reaparecer na cabeça de outra pessoa. Tem `LOCK TABLE ... SHARE ROW EXCLUSIVE` para a fila ser fila.
- **Promessa permanente não se tira.** Se um dia as vagas mudarem, muda `vagas_de_embaixadora()` para a frente; quem já tem o título fica com ele. Tirar acesso prometido de quem chegou primeiro e confiou é a pior coisa que a nommi pode fazer.
- `tem_premium()` é o **único lugar** que decide quem tem acesso pago. Hoje responde "é embaixadora?"; no dia da cobrança passa a ser "é embaixadora OU tem assinatura ativa", e nenhuma tela precisa mudar. Nenhuma tela pergunta "pagou?" por conta própria.
- O título **não** dá vantagem social: não aparece mais na descoberta, não sobe no match, não cria duas classes de gente. Numa rede de amizade isso se sente na hora.
- `usar_convite()` agora faz três coisas: marca o convite, **cria a amizade já aceita** com quem convidou (para ninguém cair numa rede vazia no primeiro minuto) e chama `virar_embaixadora()`.
- `convites_que_vingaram()` conta **quem ficou**, não quem foi chamado: precisa ter apelido e estar em pelo menos uma tribo. Contar envio premiaria espalhar link em grupo, e link espalhado queima a nommi. Teste garante que a frase na tela nunca diga "enviados".
- `embaixadoras` entrou em `meus_dados()` e em `apagar_minha_conta()` no mesmo commit da criação, como manda a regra da casa. O `DELETE` é explícito porque o `DELETE FROM auth.users` final está dentro de um `EXCEPTION` que engole erro.
- Cliente **não escreve** em `embaixadoras`: só `GRANT SELECT`. Quem dá o título é o banco, na hora em que o convite é usado.
- **Decisão da Ju (30/10): 100 vagas, e o título é de quem chega primeiro, com convite ou sem.** Quem entrou cedo direto pelo Google chegou cedo do mesmo jeito; premiar só o link criava o caso de estar entre as primeiras e não ganhar nada. Quem dá é o gatilho `profiles_titulo_de_quem_chega`, não a tela de cadastro, porque há vários caminhos de entrada (Google, Apple, e-mail, link) e qualquer um poderia esquecer.
- A guarda contra conta de teste e apelido vazio mora **dentro** de `virar_embaixadora()`, a única função que insere. Isso já falhou uma vez: duas contas de teste da Ju pegaram os números 1 e 3, e depois 10 e 11, por não estarem marcadas `is_test`. Marcar a conta como teste agora **tira** o título pelo mesmo gatilho.
- Números 1 a 9 já foram mostrados e não se mexem mais. Renumerar só valeu enquanto ninguém tinha visto o número.

## O radar fora de Belo Horizonte (0040)
- O catálogo de lugares do radar eram **20 endereços escritos à mão, todos em BH**. Quem liga o radar em São Paulo, no Rio, em João Monlevade, Rio Piracicaba ou Florianópolis — todas cidades com gente cadastrada — não recebia sugestão nenhuma e lia um texto pedindo desculpa por não ser BH.
- Pior: `nearestPlace()` percorria essa lista e devolvia o **menos distante sem olhar a distância**. Quem estava em São Paulo era avisada de que estava no BH Shopping. A Ju, no Buritis, via sempre o mesmo lugar porque a lista não tem nada perto do bairro dela.
- Escrever um catálogo do Brasil à mão seria inventar dado e envelheceria na semana seguinte. Agora o radar tem **três fontes**, nesta ordem: os lugares que a própria pessoa já usou (`meus_lugares`), os lugares que já foram endereço de rolê ou tribo na cidade dela (`lugares_da_cidade`), e o catálogo de BH **só quando ela está a menos de 40 km de BH**.
- **Lugar onde outra pessoa esteve nunca entra.** Alguém pode escrever "Casa da Bia" no radar, e isso é a casa de alguém. Lugar de rolê é endereço de encontro, público por natureza; presença de outra pessoa não é, nunca. É por isso que `meus_lugares` é visível só para a dona.
- `lugares_da_cidade()` devolve **só nome e cidade, nunca de qual tribo veio**: dizer "aqui teve o rolê da tribo tal" entregaria a existência de uma tribo fechada.
- `maisPertoDeVerdade()` só aponta um lugar se a pessoa estiver a menos de 2 km dele. Melhor não dizer nada do que dizer o lugar errado. `nearestPlaceDemo()` (o antigo) ficou só para a apresentação, com o nome avisando.
- Cidade comparada com `sem_acento()` + `lower()`: "São Paulo", "sao paulo" e "Sao Paulo" são a mesma cidade e as pessoas escrevem dos três jeitos. A extensão `unaccent` não está instalada.
- **Escrever o nome do lugar é caminho normal, não plano B**: é o que funciona em qualquer lugar do mundo. Tem teste barrando o recado voltar a pedir desculpa ou a nomear Belo Horizonte como "a cidade que funciona".
- A cidade do perfil já vem preenchida no radar: a pessoa não digita de novo o que contou no cadastro.

## O link de convite que não fazia nada (30/10, bug grave)
- O link de convite sempre carregou `?convite=CODIGO&tribo=ID`, e **nada no app lia esses dois valores**. `usar_convite()` existia no banco desde o começo e **nunca foi chamada por tela nenhuma**. Resultado: quem entrava por um link não virava amiga de quem convidou, não caía dentro da tribo, e `convites_que_vingaram()` ia ficar em zero para sempre. A Ju estava mandando convites acreditando que funcionava.
- Explicou um sintoma que eu tinha visto e não entendi: a Michelle e a Jaque chegaram e ficaram com zero tribo.
- **O código tem que atravessar o login.** Google e Apple devolvem a pessoa num endereço limpo, sem `?convite=`. Por isso `useGuardarConviteDaUrl()` guarda no aparelho **assim que a página abre, antes de qualquer login**, e `useConviteNaChegada()` usa depois, quando a conta já existe. Mesma lição do "Missing state parameter": o que precisa atravessar o login não pode viver só na barra de endereço.
- O código sai da barra de endereço depois de guardado (`enderecoSemConvite`), para não ficar no histórico nem ser recolado.
- `tribo=abc` virava `NaN` e a pessoa entraria numa tribo que não existe: só número passa. Tem teste.
- `codigo` pode ser **vazio**: a página pública da tribo manda só `?tribo=`, sem código, porque link de divulgação é usado por muita gente e código de convite vale uma vez só. Nesse caso não há amizade automática, só a entrada na tribo.
- Falhar ao entrar na tribo **nunca** desfaz o convite: tribo fechada e tribo sensível recusam de propósito, e a amizade com quem convidou é o que mais importa.

## A tribo é da dona (0041)
- Pedido da Ju: quem cria a tribo escreve missão, valores, visão e as próprias regras; escolhe capa e figurinha; decide quem cria rolê; e tem um link da tribo para divulgar nas redes.
- **Descoberta no caminho: o rolê não era da tribo.** Rolê e tribo são a mesma tabela (`teias`, com `kind`) e não havia ligação nenhuma entre os dois — todo rolê era solto. Daí `teias.tribo_id`. Sem isso, "quem cria rolê nesta tribo" não tinha onde se apoiar.
- **Segunda descoberta: a aba Eventos da tribo mostrava meta de exemplo** ("Próxima parada: day spa", com pontos) para conta real. Sobra da apresentação, igual aos cartões de rolê que já saíram do Início.
- `who_roles` ('todos' | 'criadora') é conferido por `pode_criar_role_na_tribo()` **na política de INSERT de teias**: a trava é do banco, não da tela.
- `teias.figurinha` guarda o **nome do catálogo**, nunca o desenho e nunca endereço de imagem. Nome fora do catálogo não desenha nada, em vez de virar texto solto. Tem teste.
- **O link público nasce desligado** (`link_publico` default false). Se toda tribo tivesse página aberta, bastaria varrer os ids para listar tribo por tribo.
- **Tribo sensível não tem página pública, nem se a dona ligar**: `tribo_publica()` recusa na leitura e o gatilho `teias_sensivel_sem_pagina` impede o valor de ficar gravado como true. Política, religião e orientação: página aberta dessas expõe o assunto de quem está lá, e quem entrou não escolheu isso.
- A página pública **não mostra membro nenhum**, nem nome nem foto: entrar numa tribo não é aceitar virar vitrine de divulgação. O número de pessoas é o real, sempre.
- `/tribo/$id` é rota pública (entra na mesma lista de `social-shell` que termos e privacidade): link que só abre para quem já está dentro não divulga nada.
- `roles_da_tribo()` só responde para quem é da tribo.
- `IdentidadeDaTribo` só mostra o que a dona escreveu. Tribo sem nada escrito não mostra título vazio: três cabeçalhos sem texto embaixo fazem a tribo parecer abandonada, que é o contrário do pretendido.
- A aba "Sua tribo" só existe para quem criou. As abas da tribo agora são Membros · Posts · Só entre nós · Rolês · Sua tribo.

## O chip escolhido que não parecia escolhido (30/10)
- Existiam **dois nomes** para "este chip está escolhido", `selected` e `active`, e **só `selected` tinha estilo**. Sete chips pelo app usavam `active` e ficavam idênticos aos não escolhidos: a atividade e a duração do Radar, o prazo do "Só entre nós", e os botões novos de quem cria rolê. A pessoa tocava e a tela não respondia.
- Correção: um nome só, `selected`. Não styled o `active` de propósito — dois nomes para a mesma coisa é como o bug nasceu.
- `src/test/contraste.test.ts` lê os componentes e **barra `active` em chip**. (Teste conferido: reintroduzir o nome antigo faz ele falhar.)
- `.cover-preset.active` continua existindo e tem estilo próprio; o problema era só o chip.
