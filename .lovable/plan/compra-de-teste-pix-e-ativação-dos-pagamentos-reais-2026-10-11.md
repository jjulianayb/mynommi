# Compra de teste, Pix e ativação dos pagamentos reais

## 1. Compra de teste na Carteira (cartão 4242)
- Entrar no app com uma conta real de teste, abrir a Carteira e comprar o pacote de 10 créditos com o cartão 4242 4242 4242 4242.
- Confirmar que o saldo sobe de 10 e que o histórico mostra "Compra de 10 créditos (teste)".
- Se os créditos não entrarem, verificar se a confirmação do pagamento chegou ao app e corrigir antes de seguir.
- Mostrar o resultado com uma captura de tela da Carteira.

## 2. Pix na compra de créditos
- Adicionar Pix como forma de pagamento junto com o cartão na tela de compra.
- No Pix, o app mostra o QR Code e o "copia e cola". Os créditos entram só quando o Pix é confirmado. Se a pessoa não pagar, nada é cobrado nem creditado.
- Avisar na tela: "Pix aguardando pagamento" e atualizar o saldo quando confirmar.
- Limite: o Pix só funciona quando a conta de recebimento é brasileira. Em modo de teste, pode ser que ele não apareça até a conta ser ativada com os dados da sua empresa. Nesse caso, a tela continua só com o cartão e o Pix aparece sozinho depois.

## 3. Destaques
- Os destaques (perfil por 24 h e convite) continuam sendo pagos com créditos. Assim, quem paga com Pix compra os créditos e usa no destaque. É um caminho só, sem preços duplicados.
- Trazer para a conta real o "Destacar convite" (3 créditos), que hoje só existe na demonstração. A cobrança é feita no servidor, igual ao destaque de perfil.

## 4. Etapas para receber dinheiro de verdade
Estas etapas precisam ser feitas por você, porque pedem os dados da empresa e do banco. Eu não consigo preencher por você:
1. Na aba de pagamentos, reivindicar a conta de pagamentos.
2. Preencher os dados da empresa (CNPJ, endereço e responsável) e a conta bancária para receber (pode ser do Nubank ou do C6).
3. Instalar o app Lovable na conta ativa (um clique).
4. Depois disso, a ativação final é automática. Eu confiro o status, rodo a checagem final e publico o app.

## Detalhes técnicos
- Teste: Playwright com sessão real criada por `lovable auth-session`; consultar `credit_purchases` e `credit_ledger` para confirmar o crédito; verificar se o webhook de teste chega ao handler `/api/public/payments/webhook`.
- Pix: `payment_method_types: ['card','pix']` com `payment_method_options.pix.expires_after_seconds`. O webhook já credita em `checkout.session.async_payment_succeeded`. Vou adicionar o tratamento de `async_payment_failed` (só registrar o evento).
- Destaque de convite real: nova função security definer `spend_invite_boost(invite_id)` que debita 3 créditos e grava no histórico. Execução liberada só para `authenticated`.
- Testes: um teste para a regra de Pix pendente (nada creditado antes da confirmação) e um teste para o custo de 3 créditos do convite.
- Go-live: `payments--get_go_live_status` para acompanhar o progresso; publicar quando todas as etapas estiverem concluídas.
