# Radar Nommi com localização + ideias de encontros para empresas

## 1. Radar Nommi: "onde você está agora"
Hoje o radar tem só 4 lugares fixos. Mudanças:
- **Usar minha localização** (botão): o navegador pede permissão uma vez. O app converte para o bairro aproximado mais próximo e nunca guarda nem mostra o ponto exato.
- **Ou digitar onde está**: campo com busca ("Savassi", "Shopping Cidade", "Cinema do Belas Artes") e sugestões de lugares públicos. Se não achar, a pessoa escreve o nome do lugar livremente.
- **Mais lugares**: lista de cerca de 20 lugares públicos de exemplo em BH (cafés, parques, cinemas, shoppings, livrarias, empresas parceiras), separados por tipo, para filtrar.
- **"Nommi Liga" (quem está por perto)**: depois de ativar, aparece o mapa estilizado com as pessoas no mesmo lugar e uma lista "Perto de você", com a distância aproximada ("no mesmo lugar", "a 5 min", "a 15 min").
- **O que a pessoa topa agora**: na hora de ativar, a pessoa escolhe entre Tomar um café, Dar uma volta, Ir ao cinema, Bater papo, Comer algo e Só dizer oi. Cada pessoa no radar mostra o que topa, e dá para filtrar por essas opções.
- **Toque numa pessoa**: abre um cartão com foto, nome, interesses e o que ela topa, com os botões "Topo também" (envia o convite) e "Ver perfil".
- **Regras mantidas**: só lugares públicos; perfis privados ficam visíveis só para amizades; dá para sair do radar a qualquer momento; a pessoa some quando o tempo acaba; o aviso de primeiro encontro aparece no cartão.

## 2. Ideias de encontros para empresas (com IA)
No **Painel do parceiro**, uma nova seção **"Perfil e comunidade"**:
- **A empresa informa**: tipo de lugar, bairro aproximado, horários bons, capacidade aproximada, o que oferece para teias e os interesses da comunidade da marca (chips + texto livre curto).
- **Botão "Gerar ideias de encontros"**: a IA devolve 4 ideias acolhedoras. Cada ideia traz título, descrição curta, melhor dia e hora, tamanho de teia sugerido, bônus sugerido e por que acolhe quem chega sozinho.
- **Cada ideia tem "Usar como desafio"**, que já cria o encontro com os pontos e o parceiro preenchidos, e "Gerar outras".
- **Cuidados nas ideias**: sem álcool como foco principal, sem competição entre pessoas, sem pressão para consumir, e sempre um jeito leve de quem chega sozinho entrar na conversa.
- **Limite de uso**: no mesmo padrão das sugestões de mensagem (por aparelho e por dia), com aviso claro quando passar do limite ou se a IA estiver indisponível.
- O perfil da empresa fica salvo neste aparelho; não há conta real de empresa ainda.

## Fora desta etapa
Localização em tempo real de outras pessoas (as pessoas por perto continuam de exemplo) e contas reais de empresas.

## Detalhes técnicos
- Radar: `navigator.geolocation.getCurrentPosition` só ao tocar no botão; arredondar para o bairro mais próximo de uma lista de centroides em `src/lib/radar.ts` (lugares, tipos, atividades, distância aproximada, filtro de privacidade) com testes. Coordenadas não são persistidas.
- IA: novo `src/lib/meetup-ideas.functions.ts` (`createServerFn`), AI Gateway via Responses com `openai/gpt-6-astra`, saída em JSON com esquema estrito, transmissão em fluxo consumida no servidor, entradas limpas e limitadas, limite em memória por IP e teto diário, erros 402/429 com mensagem amigável. Helpers do gateway copiados para um módulo só do servidor.
- O estado do perfil da empresa vai para `DemoState.partnerProfile`; as ideias não são persistidas.
