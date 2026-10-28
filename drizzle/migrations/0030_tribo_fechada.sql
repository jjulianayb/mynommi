-- Tribo aberta ou fechada, pedido da Ana Gouveia testando o app.
-- Aberta: entra quem quiser. Fechada: manda pedido e a criadora decide.
-- A porta fica no banco: a política de entrar confere se a tribo é aberta.

ALTER TABLE public.teias
  ADD COLUMN IF NOT EXISTS entrada text NOT NULL DEFAULT 'aberta'
    CHECK (entrada IN ('aberta', 'fechada'));

CREATE TABLE public.pedidos_de_tribo (
  teia_id bigint NOT NULL REFERENCES public.teias(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  recado text NOT NULL DEFAULT '' CHECK (char_length(recado) <= 200),
  status text NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'aceito', 'recusado')),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (teia_id, user_id)
);
CREATE INDEX pedidos_de_tribo_idx ON public.pedidos_de_tribo (teia_id, status);
GRANT SELECT, INSERT, DELETE ON public.pedidos_de_tribo TO authenticated;
GRANT UPDATE (status) ON public.pedidos_de_tribo TO authenticated;
GRANT ALL ON public.pedidos_de_tribo TO service_role;
ALTER TABLE public.pedidos_de_tribo ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.tribo_e_aberta(_teia bigint)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT coalesce((SELECT t.entrada = 'aberta' FROM public.teias t WHERE t.id = _teia), false)
$$;
REVOKE ALL ON FUNCTION public.tribo_e_aberta(bigint) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.tribo_e_aberta(bigint) TO authenticated;

CREATE POLICY "Ver meu pedido e os da minha tribo" ON public.pedidos_de_tribo FOR SELECT TO authenticated
  USING (user_id = auth.uid()
         OR public.is_teia_creator(teia_id, auth.uid())
         OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Pedir para entrar" ON public.pedidos_de_tribo FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND NOT public.tribo_e_aberta(teia_id));
CREATE POLICY "Criadora responde o pedido" ON public.pedidos_de_tribo FOR UPDATE TO authenticated
  USING (public.is_teia_creator(teia_id, auth.uid()) OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.is_teia_creator(teia_id, auth.uid()) OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Desistir do pedido" ON public.pedidos_de_tribo FOR DELETE TO authenticated
  USING (user_id = auth.uid() OR public.is_teia_creator(teia_id, auth.uid()));

-- Entrar sozinho só em tribo aberta. Em tribo fechada, quem põe é a função abaixo.
DROP POLICY IF EXISTS "Entrar numa tribo" ON public.teia_members;
CREATE POLICY "Entrar numa tribo" ON public.teia_members FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND length(teia_key) <= 40
    AND length(nickname) <= 40
    AND (teia_key !~ '^[0-9]+$' OR public.tribo_e_aberta(teia_key::bigint))
  );

-- Aceitar o pedido: põe a pessoa na tribo e marca o pedido. Só a criadora.
CREATE OR REPLACE FUNCTION public.responder_pedido(_teia bigint, _quem uuid, _aceitar boolean)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _nome text;
BEGIN
  IF NOT (public.is_teia_creator(_teia, auth.uid()) OR public.has_role(auth.uid(), 'admin')) THEN
    RETURN 'erro';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.pedidos_de_tribo p
                  WHERE p.teia_id = _teia AND p.user_id = _quem AND p.status = 'pendente') THEN
    RETURN 'erro';
  END IF;

  UPDATE public.pedidos_de_tribo SET status = CASE WHEN _aceitar THEN 'aceito' ELSE 'recusado' END
   WHERE teia_id = _teia AND user_id = _quem;

  IF _aceitar THEN
    SELECT coalesce(nullif(nickname, ''), 'nommi') INTO _nome FROM public.profiles WHERE id = _quem;
    INSERT INTO public.teia_members (teia_key, user_id, nickname)
    VALUES (_teia::text, _quem, _nome)
    ON CONFLICT DO NOTHING;
  END IF;
  RETURN CASE WHEN _aceitar THEN 'aceito' ELSE 'recusado' END;
END $$;
REVOKE ALL ON FUNCTION public.responder_pedido(bigint, uuid, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.responder_pedido(bigint, uuid, boolean) TO authenticated;

-- A fila de pedidos de uma tribo, para quem cuida dela.
CREATE OR REPLACE FUNCTION public.pedidos_da_tribo(_teia bigint)
RETURNS TABLE (user_id uuid, nickname text, avatar_url text, city text, recado text, quando timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT p.user_id, pr.nickname, pr.avatar_url, pr.city, p.recado, p.created_at
  FROM public.pedidos_de_tribo p
  JOIN public.profiles pr ON pr.id = p.user_id
  WHERE p.teia_id = _teia AND p.status = 'pendente'
    AND (public.is_teia_creator(_teia, auth.uid()) OR public.has_role(auth.uid(), 'admin'))
  ORDER BY p.created_at
  LIMIT 100
$$;
REVOKE ALL ON FUNCTION public.pedidos_da_tribo(bigint) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.pedidos_da_tribo(bigint) TO authenticated;

-- list_teias passa a dizer se a tribo é fechada e em que pé está o meu pedido.
DROP FUNCTION IF EXISTS public.list_teias(uuid, bigint);
CREATE FUNCTION public.list_teias(_creator uuid DEFAULT NULL::uuid, _id bigint DEFAULT NULL::bigint)
RETURNS TABLE(id bigint, kind text, name text, mode text, category text, city text, place text,
              when_text text, creator_nickname text, created_at timestamptz, starts_at timestamptz,
              capacity integer, going_count integer, i_am_going boolean, about text, rule text,
              official boolean, member_count integer, i_am_member boolean, cover_path text,
              audience text, who_posts text, i_can_post boolean, i_am_creator boolean,
              entrada text, meu_pedido text, pedidos_abertos integer)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT t.id, t.kind, t.name, t.mode, t.category, t.city, t.place, t.when_text,
         CASE WHEN t.official THEN 'nommi' ELSE t.creator_nickname END,
         t.created_at, t.starts_at, t.capacity,
         (SELECT count(*)::int FROM public.teia_rsvps r WHERE r.teia_id = t.id),
         EXISTS (SELECT 1 FROM public.teia_rsvps r WHERE r.teia_id = t.id AND r.user_id = auth.uid()),
         t.about, t.rule, t.official,
         (SELECT count(*)::int FROM public.teia_members m WHERE m.teia_key = t.id::text),
         EXISTS (SELECT 1 FROM public.teia_members m WHERE m.teia_key = t.id::text AND m.user_id = auth.uid()),
         t.cover_path, t.audience, t.who_posts,
         public.pode_falar_na_tribo(t.id, auth.uid()),
         t.created_by = auth.uid(),
         t.entrada,
         (SELECT p.status FROM public.pedidos_de_tribo p
           WHERE p.teia_id = t.id AND p.user_id = auth.uid()),
         CASE WHEN t.created_by = auth.uid()
              THEN (SELECT count(*)::int FROM public.pedidos_de_tribo p
                     WHERE p.teia_id = t.id AND p.status = 'pendente')
              ELSE 0 END
  FROM public.teias t
  WHERE auth.uid() IS NOT NULL
    AND (NOT t.is_test OR public.ve_contas_de_teste())
    AND (t.official OR NOT public.is_blocked_between(auth.uid(), t.created_by))
    AND (_creator IS NULL OR t.created_by = _creator)
    AND (_id IS NULL OR t.id = _id)
  ORDER BY t.official DESC, t.created_at DESC
  LIMIT 200
$$;

-- Avisa a criadora que chegou pedido, e a pessoa quando foi aceita.
CREATE OR REPLACE FUNCTION public.aviso_pedido_tribo() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE dono uuid; nome text; tribo text;
BEGIN
  SELECT t.created_by, t.name INTO dono, tribo FROM public.teias t WHERE t.id = NEW.teia_id;
  SELECT coalesce(nullif(nickname, ''), 'Alguém') INTO nome FROM public.profiles WHERE id = NEW.user_id;
  IF TG_OP = 'INSERT' THEN
    PERFORM public.avisar(dono, 'entrou_na_tribo', NEW.user_id, NEW.teia_id, NULL,
      nome || ' quer entrar na tribo ' || coalesce(tribo, ''));
  ELSIF NEW.status = 'aceito' AND OLD.status <> 'aceito' THEN
    PERFORM public.avisar(NEW.user_id, 'entrou_na_tribo', dono, NEW.teia_id, NULL,
      'Seu pedido para entrar em ' || coalesce(tribo, 'uma tribo') || ' foi aceito');
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER pedido_de_tribo_avisa AFTER INSERT OR UPDATE ON public.pedidos_de_tribo
  FOR EACH ROW EXECUTE FUNCTION public.aviso_pedido_tribo();
