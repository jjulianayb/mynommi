-- Avisos: sem eles ninguém descobre que foi chamado, e ninguém volta.

CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  kind text NOT NULL CHECK (kind IN ('amizade_pedida','amizade_aceita','comentario','reacao','mural','entrou_na_tribo','quero_ir','recado_tribo')),
  actor_id uuid,
  teia_id bigint,
  post_id uuid,
  body text NOT NULL DEFAULT '' CHECK (char_length(body) <= 200),
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (actor_id IS NULL OR actor_id <> user_id)
);
CREATE INDEX notifications_user_idx ON public.notifications (user_id, read_at, created_at DESC);
GRANT SELECT, DELETE ON public.notifications TO authenticated;
GRANT UPDATE (read_at) ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Ver os meus avisos" ON public.notifications FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Marcar meu aviso como lido" ON public.notifications FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "Apagar meu aviso" ON public.notifications FOR DELETE TO authenticated USING (user_id = auth.uid());
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- Quem avisa é o servidor: ninguém escreve aviso para si nem para os outros.
CREATE OR REPLACE FUNCTION public.avisar(_user uuid, _kind text, _actor uuid, _teia bigint, _post uuid, _body text)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  INSERT INTO public.notifications (user_id, kind, actor_id, teia_id, post_id, body)
  SELECT _user, _kind, _actor, _teia, _post, left(coalesce(_body, ''), 200)
  WHERE _user IS NOT NULL AND (_actor IS NULL OR _actor <> _user)
    AND NOT public.is_blocked_between(_user, coalesce(_actor, _user))
$$;
REVOKE ALL ON FUNCTION public.avisar(uuid, text, uuid, bigint, uuid, text) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.aviso_conexao() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE quem text;
BEGIN
  IF TG_OP = 'INSERT' THEN
    SELECT nickname INTO quem FROM public.profiles WHERE id = NEW.requester_id;
    PERFORM public.avisar(NEW.addressee_id, 'amizade_pedida', NEW.requester_id, NULL, NULL,
      coalesce(nullif(quem,''),'Alguém') || ' quer ser sua amizade');
  ELSIF NEW.status = 'aceita' AND OLD.status <> 'aceita' THEN
    SELECT nickname INTO quem FROM public.profiles WHERE id = NEW.addressee_id;
    PERFORM public.avisar(NEW.requester_id, 'amizade_aceita', NEW.addressee_id, NULL, NULL,
      coalesce(nullif(quem,''),'Alguém') || ' aceitou seu pedido. Já dá para conversar');
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER conexao_avisa AFTER INSERT OR UPDATE ON public.connections FOR EACH ROW EXECUTE FUNCTION public.aviso_conexao();

CREATE OR REPLACE FUNCTION public.aviso_comentario() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE dono uuid; quem text;
BEGIN
  SELECT author_id INTO dono FROM public.posts WHERE id = NEW.post_id;
  SELECT nickname INTO quem FROM public.profiles WHERE id = NEW.author_id;
  PERFORM public.avisar(dono, 'comentario', NEW.author_id, NULL, NEW.post_id,
    coalesce(nullif(quem,''),'Alguém') || ' comentou: ' || left(NEW.body, 80));
  RETURN NEW;
END $$;
CREATE TRIGGER comentario_avisa AFTER INSERT ON public.post_comments FOR EACH ROW EXECUTE FUNCTION public.aviso_comentario();

CREATE OR REPLACE FUNCTION public.aviso_reacao() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE dono uuid; quem text;
BEGIN
  SELECT author_id INTO dono FROM public.posts WHERE id = NEW.post_id;
  SELECT nickname INTO quem FROM public.profiles WHERE id = NEW.user_id;
  PERFORM public.avisar(dono, 'reacao', NEW.user_id, NULL, NEW.post_id,
    coalesce(nullif(quem,''),'Alguém') || ' reagiu ao que você publicou');
  RETURN NEW;
END $$;
CREATE TRIGGER reacao_avisa AFTER INSERT ON public.post_reactions FOR EACH ROW EXECUTE FUNCTION public.aviso_reacao();

CREATE OR REPLACE FUNCTION public.aviso_mural() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE quem text;
BEGIN
  SELECT nickname INTO quem FROM public.profiles WHERE id = NEW.author_id;
  PERFORM public.avisar(NEW.target_id, 'mural', NEW.author_id, NULL, NULL,
    coalesce(nullif(quem,''),'Alguém') || ' escreveu no seu mural' ||
    CASE WHEN NEW.status = 'pendente' THEN '. Aprove para aparecer' ELSE '' END);
  RETURN NEW;
END $$;
CREATE TRIGGER mural_avisa AFTER INSERT ON public.wall_items FOR EACH ROW EXECUTE FUNCTION public.aviso_mural();

CREATE OR REPLACE FUNCTION public.aviso_entrou() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE dona uuid; nome text; quem text;
BEGIN
  IF NEW.teia_key !~ '^[0-9]+$' THEN RETURN NEW; END IF;
  SELECT created_by, name INTO dona, nome FROM public.teias WHERE id = NEW.teia_key::bigint;
  SELECT nickname INTO quem FROM public.profiles WHERE id = NEW.user_id;
  PERFORM public.avisar(dona, 'entrou_na_tribo', NEW.user_id, NEW.teia_key::bigint, NULL,
    coalesce(nullif(quem,''),'Alguém') || ' entrou na tribo ' || coalesce(nome,''));
  RETURN NEW;
END $$;
CREATE TRIGGER entrou_avisa AFTER INSERT ON public.teia_members FOR EACH ROW EXECUTE FUNCTION public.aviso_entrou();

CREATE OR REPLACE FUNCTION public.aviso_quero_ir() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE dona uuid; nome text; quem text;
BEGIN
  SELECT created_by, name INTO dona, nome FROM public.teias WHERE id = NEW.teia_id;
  SELECT nickname INTO quem FROM public.profiles WHERE id = NEW.user_id;
  PERFORM public.avisar(dona, 'quero_ir', NEW.user_id, NEW.teia_id, NULL,
    coalesce(nullif(quem,''),'Alguém') || ' vai no rolê ' || coalesce(nome,''));
  RETURN NEW;
END $$;
CREATE TRIGGER quero_ir_avisa AFTER INSERT ON public.teia_rsvps FOR EACH ROW EXECUTE FUNCTION public.aviso_quero_ir();

-- Quantos avisos faltam ler.
CREATE OR REPLACE FUNCTION public.avisos_nao_lidos()
RETURNS integer LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT count(*)::int FROM public.notifications
  WHERE user_id = auth.uid() AND read_at IS NULL AND auth.uid() IS NOT NULL
$$;
REVOKE ALL ON FUNCTION public.avisos_nao_lidos() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.avisos_nao_lidos() TO authenticated;
