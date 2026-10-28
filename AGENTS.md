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
