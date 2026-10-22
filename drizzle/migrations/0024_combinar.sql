-- Combinar: ver os interesses de alguém, dizer se quer conhecer, e virar amizade quando os dois querem.
-- Regra do produto: a resposta é privada. Ninguém descobre que foi passado.

-- 1. Aviso de match.
ALTER TABLE public.notifications DROP CONSTRAINT notifications_kind_check;
ALTER TABLE public.notifications ADD CONSTRAINT notifications_kind_check
  CHECK (kind IN ('amizade_pedida','amizade_aceita','comentario','reacao','mural','entrou_na_tribo','quero_ir','recado_tribo','match'));

-- 2. Respostas: cada pessoa só vê as suas. Não há GRANT de INSERT: só entra pela função.
CREATE TABLE public.curtidas (
  de uuid NOT NULL,
  para uuid NOT NULL,
  resposta text NOT NULL CHECK (resposta IN ('sim','passar')),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (de, para),
  CHECK (de <> para)
);
CREATE INDEX curtidas_para_idx ON public.curtidas (para, resposta);
GRANT SELECT ON public.curtidas TO authenticated;
GRANT ALL ON public.curtidas TO service_role;
ALTER TABLE public.curtidas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Vejo as minhas respostas" ON public.curtidas FOR SELECT TO authenticated USING (de = auth.uid());

-- 3. Quem pode aparecer no baralho, em ordem de afinidade.
-- Quem já me escolheu vem primeiro: é o que faz o match acontecer num app ainda pequeno.
CREATE OR REPLACE FUNCTION public.pessoas_para_combinar(_limite integer DEFAULT 20)
RETURNS TABLE (
  user_id uuid, nickname text, avatar_url text, cover_path text, city text, about text,
  interests text[], goals text[], places text[], looking_for text, person_verified boolean,
  em_comum text[], afinidade integer, mesma_cidade boolean, ja_me_curtiu boolean
) LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH eu AS (SELECT id, interests, goals, city FROM public.profiles WHERE id = auth.uid())
  SELECT p.id, p.nickname, p.avatar_url, p.cover_path, p.city, p.about,
         p.interests, p.goals, p.places, p.looking_for, p.person_verified,
         ARRAY(SELECT unnest(p.interests) INTERSECT SELECT unnest(e.interests)),
         (cardinality(ARRAY(SELECT unnest(p.interests) INTERSECT SELECT unnest(e.interests))) * 2
          + cardinality(ARRAY(SELECT unnest(p.goals) INTERSECT SELECT unnest(e.goals)))
          + CASE WHEN p.city = e.city AND p.city <> '' THEN 1 ELSE 0 END)::int,
         (p.city = e.city AND p.city <> ''),
         EXISTS (SELECT 1 FROM public.curtidas c WHERE c.de = p.id AND c.para = e.id AND c.resposta = 'sim')
  FROM public.profiles p, eu e
  WHERE p.id <> e.id
    AND p.profile_mode = 'publico'
    AND NOT p.is_business
    AND NOT public.is_blocked_between(e.id, p.id)
    AND NOT EXISTS (SELECT 1 FROM public.curtidas c WHERE c.de = e.id AND c.para = p.id)
    AND NOT EXISTS (SELECT 1 FROM public.connections k WHERE k.status = 'aceita'
          AND ((k.requester_id = e.id AND k.addressee_id = p.id)
            OR (k.addressee_id = e.id AND k.requester_id = p.id)))
  ORDER BY 15 DESC, 13 DESC, p.created_at DESC
  LIMIT least(greatest(coalesce(_limite, 20), 1), 50)
$$;
REVOKE ALL ON FUNCTION public.pessoas_para_combinar(integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.pessoas_para_combinar(integer) TO authenticated;

-- 4. A resposta. Devolve 'match', 'guardado' ou 'passou'.
-- Pedido de amizade que já estava pendente conta como sim da outra pessoa: dizer sim aceita o pedido.
CREATE OR REPLACE FUNCTION public.responder_pessoa(_para uuid, _sim boolean)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _eu uuid := auth.uid(); _deu boolean;
BEGIN
  IF _eu IS NULL OR _para IS NULL OR _para = _eu THEN RETURN 'erro'; END IF;
  IF public.is_blocked_between(_eu, _para) THEN RETURN 'erro'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = _para AND profile_mode = 'publico') THEN
    RETURN 'erro';
  END IF;

  INSERT INTO public.curtidas (de, para, resposta)
  VALUES (_eu, _para, CASE WHEN _sim THEN 'sim' ELSE 'passar' END)
  ON CONFLICT (de, para) DO UPDATE SET resposta = EXCLUDED.resposta, created_at = now();

  IF NOT _sim THEN RETURN 'passou'; END IF;

  SELECT EXISTS (SELECT 1 FROM public.curtidas c
                 WHERE c.de = _para AND c.para = _eu AND c.resposta = 'sim')
      OR EXISTS (SELECT 1 FROM public.connections k
                 WHERE k.requester_id = _para AND k.addressee_id = _eu AND k.status = 'pendente')
    INTO _deu;
  IF NOT _deu THEN RETURN 'guardado'; END IF;

  INSERT INTO public.connections (requester_id, addressee_id, status, accepted_at)
  VALUES (_para, _eu, 'aceita', now())
  ON CONFLICT (LEAST(requester_id, addressee_id), GREATEST(requester_id, addressee_id))
  DO UPDATE SET status = 'aceita', accepted_at = coalesce(connections.accepted_at, now());
  RETURN 'match';
END $$;
REVOKE ALL ON FUNCTION public.responder_pessoa(uuid, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.responder_pessoa(uuid, boolean) TO authenticated;

-- 5. Quantas pessoas já disseram que querem me conhecer e ainda não respondi.
-- Número real, sem nome: é convite para abrir o baralho, não vitrine de quem gostou.
CREATE OR REPLACE FUNCTION public.quem_tem_curiosidade()
RETURNS integer LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT count(*)::int FROM public.curtidas c
  WHERE auth.uid() IS NOT NULL
    AND c.para = auth.uid() AND c.resposta = 'sim'
    AND NOT public.is_blocked_between(auth.uid(), c.de)
    AND NOT EXISTS (SELECT 1 FROM public.curtidas m WHERE m.de = auth.uid() AND m.para = c.de)
    AND NOT EXISTS (SELECT 1 FROM public.connections k WHERE k.status = 'aceita'
          AND ((k.requester_id = auth.uid() AND k.addressee_id = c.de)
            OR (k.addressee_id = auth.uid() AND k.requester_id = c.de)))
$$;
REVOKE ALL ON FUNCTION public.quem_tem_curiosidade() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.quem_tem_curiosidade() TO authenticated;

-- 6. O aviso de match vai para os dois lados. Conexão criada já aceita só acontece em match.
CREATE OR REPLACE FUNCTION public.aviso_conexao() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE nome_req text; nome_end text;
BEGIN
  SELECT nickname INTO nome_req FROM public.profiles WHERE id = NEW.requester_id;
  SELECT nickname INTO nome_end FROM public.profiles WHERE id = NEW.addressee_id;
  IF TG_OP = 'INSERT' AND NEW.status = 'pendente' THEN
    PERFORM public.avisar(NEW.addressee_id, 'amizade_pedida', NEW.requester_id, NULL, NULL,
      coalesce(nullif(nome_req,''),'Alguém') || ' quer ser sua amizade');
  ELSIF TG_OP = 'INSERT' AND NEW.status = 'aceita' THEN
    PERFORM public.avisar(NEW.requester_id, 'match', NEW.addressee_id, NULL, NULL,
      'Deu match com ' || coalesce(nullif(nome_end,''),'alguém') || '. Já dá para conversar');
    PERFORM public.avisar(NEW.addressee_id, 'match', NEW.requester_id, NULL, NULL,
      'Deu match com ' || coalesce(nullif(nome_req,''),'alguém') || '. Já dá para conversar');
  ELSIF NEW.status = 'aceita' AND OLD.status <> 'aceita' THEN
    PERFORM public.avisar(NEW.requester_id, 'amizade_aceita', NEW.addressee_id, NULL, NULL,
      coalesce(nullif(nome_end,''),'Alguém') || ' aceitou seu pedido. Já dá para conversar');
  END IF;
  RETURN NEW;
END $$;
