# Créditos para alcance + perfis de empresas (versão simulada)

Tudo continua demonstrativo nesta etapa: nenhum pagamento real, só as telas e as regras, para validar com pessoas antes de cobrar.

## 1. Créditos "Brilho" (aparecer para mais pessoas)
- Nova tela **Carteira** (menu lateral e em Meu plano Pro): saldo de créditos e histórico.
- Pacotes de exemplo: 10 créditos R$ 9,90 · 30 créditos R$ 24,90 · 80 créditos R$ 54,90 (valores para você ajustar).
- Pagamento simulado com três opções: **Pix** (mostra QR e "copia e cola" de exemplo, confirma em 3 s), **Apple Pay** e **Google Pay** (botão com confirmação simulada). Aviso claro: "Demonstração, nenhuma cobrança."
- Usos dos créditos, sempre com cuidado para não virar competição:
  - **Destaque por 24 h** (5 créditos): o perfil aparece primeiro no Descobrir e no Radar para quem tem interesses em comum; selo discreto "Em destaque".
  - **Destacar convite** (3 créditos): o plano sobe em "Planos perto de você".
- Regras: sem ranking público, destaque nunca ultrapassa privacidade (perfil privado não aparece para desconhecidos), máximo de 1 em cada 4 cartões do Descobrir é destacado, +18.

## 2. Perfis de empresas ("Marcas que reúnem")
O valor para a empresa: a teia vira **comunidade da marca** — pessoas que frequentam, convidam amizades e voltam em grupo.
- **Perfil da empresa** (a partir do Clube): foto, categoria, bairro aproximado, benefícios para teias, próximos encontros, e um mural de figurinhas de quem foi.
- **Teia da marca**: a empresa cria uma teia aberta (ex.: "Corredores do Trilha Aberta") e lança encontros/desafios no próprio local.
- **Embaixadores**: pessoas que mais levam teias ganham selo "Agita aqui" e bônus da empresa (sem ranking entre pessoas, só o selo).
- **Painel do parceiro** ganha: membros da teia da marca, visitas confirmadas por mês, convites destacados e créditos de alcance para a empresa (mesma carteira).
- Receita resumida: assinatura Pro + taxa por teia confirmada + créditos de alcance para pessoas e empresas.

## 3. Sobre a aparência
Está boa e consistente (branco, laranja, fotos reais, figurinhas). Ajustes pequenos que incluo:
- Menos cartões seguidos sem respiro no Início (agrupar em blocos com títulos mais fortes).
- Selo "Em destaque" e "Agita aqui" no mesmo estilo dos selos atuais, sem cores novas.

## Fora desta etapa
Cobrança real. Quando quiser ativar, será preciso contas reais e um provedor de pagamento com Pix, Apple Pay e Google Pay no Brasil (a Stripe aceita os três); aí os créditos passam a ser guardados no servidor, não no aparelho.

## Detalhes técnicos
- DemoState: `credits`, `creditHistory`, `boostUntil`, `boostedInvites`; regras em `src/lib/credits.ts` (compra, gasto, expiração do destaque, limite 1/4 no Descobrir) com testes.
- Rotas novas: `/carteira`, `/empresa/$id` (cada uma com metadados próprios).
- Teia da marca reaproveita `openTeias` com campo `partner`.
