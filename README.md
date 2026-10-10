# Nommi

**BRIEFING PARA O LOVABLE: APP "FRIENDS" (nome provisório), ETAPA 1: SÓ O VISUAL**

Construa um app mobile first, em português do Brasil, chamado Friends. É um "Tinder da amizade": adultos dão match por afinidade, formam grupos, cumprem desafios em lugares reais e ganham prêmios em estabelecimentos parceiros. Posicionamento: "Amizades para conversar, combinar e continuar."

**Etapa 1:** apenas front-end navegável com dados de exemplo salvos no próprio app. Não crie banco de dados, login real, pagamentos nem integrações. Não adicione funcionalidades fora deste briefing.

**Identidade visual (seguir o HTML anexo)**
- Cores: vermelho #E5322D, amarelo #FFC72C, azul #1F6FD6, verde-água #14A39A, texto #1B2230, fundo #FFF9EC, cartões #FFFCF5. Sem roxo.
- Fontes: Bricolage Grotesque (títulos) e DM Sans (texto).
- Cartões bem arredondados, botões em pílula, sombras suaves, microanimações discretas.
- Sem emojis. Avatares ilustrados em SVG (rosto redondo, cabelos variados, fundo colorido) e ícones de traço próprios.
- Figurinhas estilo WhatsApp: personagens expressivos com contorno branco, legenda em letras brancas com contorno escuro e leve balanço. Seis: "super legal" (óculos escuros), "doida da hora" (língua de fora), "ama vinhos" (taça), "rainha do karaokê" (coroa e microfone), "ouvinte nota 10" (olhos de coração), "topa tudo" (chapéu de festa).
- Nada da série de TV Friends (logo, personagens, imagens).

**Navegação:** barra inferior com Início, Descobrir, Conversas, Grupos, Clube e Perfil. Telas extras: Cadastro, Friends Pro e Painel do parceiro.

**Telas e regras**
1. **Cadastro:** apelido, o que procura (conversar online, gente por perto, grupos), interesses e privacidade (mostrar só a cidade, mural com aprovação). Botão "Criar meu perfil".
2. **Início:** saudação, card azul "O episódio da semana" (desafio leve, online ou presencial), sugestões de pessoas com botão "Curiosidade" e atividade dos grupos.
3. **Descobrir:** um cartão por vez (avatar, nome, idade, cidade, interesses, "por que sugerimos"). Botões "Agora não" e "Tenho curiosidade". Sem deslizar. Filtros: Online, Por perto, Grupos. Interesse dos dois abre a tela **"Deu match!"** (dois avatares entram animados; botões "Mandar mensagem" e "Continuar descobrindo").
4. **Conversas:** lista e chat. O chat só existe após o match. Mensagens de texto, figurinhas, botão "Convidar para o grupo" e acesso visível a denunciar e bloquear.
5. **Perfil** (cobertura em formas coloridas, avatar, nome, cidade, "online agora", redes em texto, números de amigas, grupos, lugares e troféus; botões "Tenho curiosidade" e "Convidar") com quatro abas:
   - **Mural:** figurinhas coladas pelos amigos, com o nome de quem colou. Toque nas figurinhas para colar. Contribuições dependem da aprovação da dona do perfil.
   - **Grupos:** cards com membros, modalidade, barra de pontos e botão de check-in.
   - **Lugares:** mapa estilizado com pinos; ao tocar, mostra visitas e bônus do lugar.
   - **Troféus:** conquistas bloqueadas e liberadas; bônus de prêmio aparece ao atingir a meta.
6. **Grupo:** nome, membros, meta de pontos, lista de desafios com check-in, formulário "Lançar novo desafio" (tipo: karaokê, vinho, day spa, trilha; pontos de 10 a 40; parceiro associado) e chat do grupo com figurinhas.
7. **Clube Friends** (como um clube de benefícios): números do usuário, filtro por categoria (Bares, Beleza, Lazer), seis parceiros de exemplo com ícone, benefício e pontos. Ao tocar, mostra o detalhe e "Resgatar com o grupo": gera código FRD-4821 se houver pontos, senão informa quantos faltam. Histórico "O que você e seu grupo já ganharam" e os grupos da pessoa.
8. **Friends Pro (simulado):** comparação Grátis x Pro (R$ 19,90/mês). Pro libera criar grupos, mais conexões por dia, figurinhas personalizadas e desafios exclusivos. Botão "Testar 30 dias grátis" só muda o estado do botão, sem cobrança.
9. **Painel do parceiro:** indicadores (grupos, pessoas, ticket médio, valor a pagar), formulário para confirmar visita (código, pessoas, valor da conta) que atualiza os números, campanhas com ativar/pausar e "Nova campanha". Taxa de exemplo: R$ 8 por grupo verificado.

**Regras de negócio**
- Pontos são do grupo. Meta de exemplo: 50 pontos libera o day spa em grupo.
- O check-in só soma pontos depois que o parceiro confirma o código.
- Sem ranking, sem competição entre pessoas e sem pontos por tempo no app.
- Match só com interesse mútuo. Maiores de 18 anos.
- Localização apenas aproximada. Nunca exibir dados sensíveis (orientação sexual, saúde). Filtros de afinidade são opcionais e declarados pela própria pessoa.
- Denunciar e bloquear sempre visíveis. Aviso de que o app não substitui apoio psicológico (CVV 188).

**Fora desta etapa:** pagamentos reais, login, banco de dados, chat em tempo real, integração com caixa, vídeo, geolocalização ao vivo, simulador de receita (fica fora do app).

**Dados de exemplo:** 8 a 12 perfis fictícios, 3 grupos, 6 parceiros, 2 desafios iniciais e conversas de demonstração.

**Pronto quando:** todas as telas navegam, os botões respondem com retorno visual e o visual segue o HTML anexo, que é a referência exata de cores, formas, avatares, ícones e figurinhas. Reproduza esse visual com a maior fidelidade possível.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/26534f8e-385d-4530-93d7-a6975253a705).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
