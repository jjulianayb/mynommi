-- O Pippo estava dando boas-vindas a conta de teste. (Bug de 06/11.)
--
-- A Tribo do Pippo tem 40 pessoas reais e **seis mensagens, todas do Pippo
-- recebendo conta de teste**: "Olha quem chegou: Teste de fluxo!", "Teste sem
-- selo", "Teste C", "Teste Delta"… As contas foram apagadas depois, então
-- sobrou o Pippo cumprimentando gente que não existe. Quem abre a tribo vê um
-- robô falando com robôs — pior que sala vazia, e encosta na linha de prova
-- social falsa que a nommi não cruza.
--
-- **A causa é a mesma de um bug que já tivemos**: eu conferi `is_test` no
-- gatilho de INSERT de `teia_members`, mas a marca de teste é posta **depois**
-- de o perfil nascer. No instante em que a pessoa entra na tribo, a coluna
-- ainda é falsa. Foi exatamente assim que duas contas de teste pegaram os
-- números 1 e 3 de Embaixadora, em 30/10.
--
-- **Regra que fica:** nunca decidir nada no instante em que o perfil é criado
-- ou entra em algo. `is_test` só é confiável depois.
--
-- A correção muda o momento, não só a guarda: o Pippo recebe quem chegou
-- **quando alguém abre a tribo**, e não no instante da entrada. Três ganhos:
-- a marca de teste já está posta; a mensagem cai quando há gente para ler
-- (boas-vindas às 3 da manhã numa sala vazia não recebe ninguém); e quem
-- chegou junto é recebido numa frase só, em vez de encher a tribo com uma
-- mensagem por pessoa.

-- 1. Limpa o que o gatilho escreveu sobre gente que não existe.
DELETE FROM public.teia_messages
 WHERE sender_id = 'a0000000-0000-4000-8000-0000000000f1'
   AND body LIKE 'Olha quem chegou:%'
   AND NOT EXISTS (
     SELECT 1 FROM public.profiles p
      WHERE NOT coalesce(p.is_test, false)
        AND teia_messages.body LIKE 'Olha quem chegou: ' || p.nickname || '!%');

-- 2. Conta de teste sai da tribo: o número de membros na tela é sempre real.
DELETE FROM public.teia_members m
 USING public.profiles p
 WHERE p.id = m.user_id AND coalesce(p.is_test, false)
   AND m.teia_key IN (SELECT t.id::text FROM public.teias t
                       WHERE t.created_by = 'a0000000-0000-4000-8000-0000000000f1');

-- 3. O gatilho sai. Receber alguém não é trabalho de gatilho de INSERT.
DROP TRIGGER IF EXISTS teia_members_pippo_recebe ON public.teia_members;
DROP FUNCTION IF EXISTS public.pippo_recebe_quem_chega();

-- 4. Receber e puxar assunto viram a mesma visita.
--
-- Receber tem prioridade sobre puxar assunto: quem acabou de chegar merece a
-- primeira fala da tribo ser sobre ela. E as duas coisas nunca saem juntas —
-- duas mensagens do Pippo seguidas é o mascote monopolizando a sala.
CREATE OR REPLACE FUNCTION public.pippo_puxa_assunto()
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _pippo uuid := 'a0000000-0000-4000-8000-0000000000f1';
  _tribo text;
  _ultima timestamptz;
  _nomes text[];
  _frase text;
  _assunto record;
  _id uuid;
BEGIN
  IF auth.uid() IS NULL THEN RETURN NULL; END IF;
  SELECT t.id::text INTO _tribo FROM public.teias t
   WHERE t.created_by = _pippo AND t.official LIMIT 1;
  IF _tribo IS NULL THEN RETURN NULL; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.teia_members m
                  WHERE m.teia_key = _tribo AND m.user_id = auth.uid()) THEN
    RETURN NULL;
  END IF;

  LOCK TABLE public.assuntos_do_pippo IN SHARE ROW EXCLUSIVE MODE;

  SELECT max(t.created_at) INTO _ultima FROM public.teia_messages t
   WHERE t.teia_key = _tribo AND t.sender_id = _pippo;

  -- Quem entrou depois da última vez que o Pippo falou. Conta de teste fica
  -- de fora — e aqui a marca já está posta, que é o ponto da correção.
  SELECT array_agg(nome ORDER BY quando) INTO _nomes FROM (
    SELECT p.nickname AS nome, m.joined_at AS quando
      FROM public.teia_members m JOIN public.profiles p ON p.id = m.user_id
     WHERE m.teia_key = _tribo
       AND m.user_id <> _pippo
       AND NOT coalesce(p.is_test, false)
       AND coalesce(p.nickname, '') <> ''
       AND m.joined_at > coalesce(_ultima, now() - interval '2 days')
     ORDER BY m.joined_at
     LIMIT 4
  ) x;

  IF _nomes IS NOT NULL AND array_length(_nomes, 1) > 0 THEN
    IF array_length(_nomes, 1) = 1 THEN
      _frase := 'Olha quem chegou: ' || _nomes[1] || '! Fala pra gente de onde você é.';
    ELSE
      _frase := 'Chegou gente nova: '
             || array_to_string(_nomes[1:array_length(_nomes,1)-1], ', ')
             || ' e ' || _nomes[array_length(_nomes,1)]
             || '! Contem pra gente de onde vocês são.';
    END IF;
    INSERT INTO public.teia_messages (teia_key, sender_id, author, body)
    VALUES (_tribo, _pippo, 'Pippo', _frase) RETURNING id INTO _id;
    RETURN _id;
  END IF;

  -- Ninguém novo: aí sim, o assunto do dia.
  IF _ultima IS NOT NULL AND _ultima > now() - public.intervalo_do_pippo() THEN
    RETURN NULL;
  END IF;

  SELECT * INTO _assunto FROM public.assuntos_do_pippo
   WHERE usado_em IS NULL ORDER BY id LIMIT 1;
  IF _assunto IS NULL THEN
    UPDATE public.assuntos_do_pippo SET usado_em = NULL;
    SELECT * INTO _assunto FROM public.assuntos_do_pippo ORDER BY id LIMIT 1;
  END IF;
  IF _assunto IS NULL THEN RETURN NULL; END IF;

  INSERT INTO public.teia_messages (teia_key, sender_id, author, body)
  VALUES (_tribo, _pippo, 'Pippo', _assunto.texto) RETURNING id INTO _id;
  UPDATE public.assuntos_do_pippo SET usado_em = now() WHERE id = _assunto.id;
  RETURN _id;
END $$;
GRANT EXECUTE ON FUNCTION public.pippo_puxa_assunto() TO authenticated;
