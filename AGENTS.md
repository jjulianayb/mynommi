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
