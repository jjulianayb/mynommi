-- Plano Pro, primeira leva. (Decisão da Ju em 01/11/2026.)
-- 1. Tribo: Pro cria até 3 (era 1). Free não cria. A trava é do banco.
-- 2. Match: Free fecha até 3 amizades; Pro não tem teto. Gatilho em
--    connections, valendo para baralho e pedido direto. Amizade que já
--    existe ninguém perde: a regra só barra match NOVO.
-- 3. Descobrir: Free vê 3 perfis por dia, Pro vê 9. Conta o que o baralho
--    entrega; o mesmo perfil no mesmo dia não conta duas vezes.
-- 4. Pippins de presente (boas-vindas e convite) valem 90 dias. Pippin
--    comprado não vence: quem pagou não perde. A baixa do que venceu roda
--    na leitura do saldo e no gasto; quem gasta, gasta primeiro o que vence.
-- Regra da casa: perfil_visto entra na exportação aqui e no apagar na 0050,
-- que saiu no mesmo empurrão.
-- ---------------------------------------------------------------------------
-- 1. Tribo: Pro cria até 3.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.confere_criacao_de_tribo()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.kind IS DISTINCT FROM 'teia' THEN RETURN NEW; END IF;
  IF public.has_role(NEW.created_by, 'admin') THEN RETURN NEW; END IF;
  -- is_test só vale para conta de teste; nos demais vira tribo comum e entra na regra.
  IF NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = NEW.created_by AND coalesce(p.is_test,false)) THEN
    NEW.is_test := false;
  END IF;
  IF NEW.is_test THEN RETURN NEW; END IF;
  IF NOT public.tem_premium(NEW.created_by) THEN
    RAISE EXCEPTION 'Criar tribo é Pro.' USING ERRCODE = '42501';
  END IF;
  IF (SELECT count(*) FROM public.teias t
      WHERE t.created_by = NEW.created_by AND t.kind = 'teia' AND NOT coalesce(t.is_test, false)) >= 3 THEN
    RAISE EXCEPTION 'No plano Pro dá para criar até 3 tribos.' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END $$;

-- ---------------------------------------------------------------------------
-- 2. Match: Free fecha até 3; Pro não tem teto.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.confere_limite_de_match()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE lado uuid;
BEGIN
  IF NEW.status IS DISTINCT FROM 'aceita' THEN RETURN NEW; END IF;
  IF TG_OP = 'UPDATE' AND OLD.status = 'aceita' THEN RETURN NEW; END IF;
  FOREACH lado IN ARRAY ARRAY[NEW.requester_id, NEW.addressee_id] LOOP
    IF NOT public.tem_premium(lado) AND (
      SELECT count(*) FROM public.connections k
      WHERE k.status = 'aceita' AND k.id IS DISTINCT FROM NEW.id
        AND (k.requester_id = lado OR k.addressee_id = lado)
    ) >= 3 THEN
      RAISE EXCEPTION 'No plano grátis dá para combinar com até 3 pessoas. Com o Pro, match não tem teto.' USING ERRCODE = '42501';
    END IF;
  END LOOP;
  RETURN NEW;
END $$;
revoke all on function public.confere_limite_de_match() from public, anon, authenticated;
DROP TRIGGER IF EXISTS connections_limite_match ON public.connections;
CREATE TRIGGER connections_limite_match
BEFORE INSERT OR UPDATE OF status ON public.connections
FOR EACH ROW EXECUTE FUNCTION public.confere_limite_de_match();

-- ---------------------------------------------------------------------------
-- 3. Descobrir: 3 perfis por dia no grátis, 9 no Pro.
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.perfil_visto (
  user_id uuid NOT NULL,
  visto_id uuid NOT NULL,
  dia date NOT NULL DEFAULT (now() AT TIME ZONE 'America/Sao_Paulo')::date,
  PRIMARY KEY (user_id, visto_id, dia)
);
CREATE INDEX IF NOT EXISTS perfil_visto_dia_idx ON public.perfil_visto (user_id, dia);
GRANT SELECT ON public.perfil_visto TO authenticated;
GRANT ALL ON public.perfil_visto TO service_role;
ALTER TABLE public.perfil_visto ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Vejo os meus vistos" ON public.perfil_visto;
CREATE POLICY "Vejo os meus vistos" ON public.perfil_visto FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- O baralho muda de cara (agora registra a vista), então a função velha sai
-- antes da nova entrar: o Postgres não troca o tipo de retorno com REPLACE.
DROP FUNCTION IF EXISTS public.pessoas_para_combinar(integer);
CREATE OR REPLACE FUNCTION public.pessoas_para_combinar(_limite integer DEFAULT 20)
RETURNS TABLE (
  user_id uuid, nickname text, avatar_url text, cover_path text, city text, about text,
  interests text[], goals text[], places text[], looking_for text, person_verified boolean,
  em_comum text[], afinidade integer, mesma_cidade boolean, ja_me_curtiu boolean,
  cover_x smallint, cover_y smallint, avatar_x smallint, avatar_y smallint
) LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public AS $$
DECLARE _teto integer; _restante integer;
BEGIN
  IF auth.uid() IS NULL THEN RETURN; END IF;
  _teto := CASE WHEN public.tem_premium(auth.uid()) THEN 9 ELSE 3 END;
  SELECT greatest(_teto - count(DISTINCT v.visto_id), 0) INTO _restante
    FROM public.perfil_visto v
   WHERE v.user_id = auth.uid() AND v.dia = (now() AT TIME ZONE 'America/Sao_Paulo')::date;
  IF _restante < 1 THEN RETURN; END IF;
  RETURN QUERY
  WITH eu AS (SELECT id, interests, goals, city FROM public.profiles WHERE id = auth.uid()),
  pacote AS (
    SELECT p.id AS uid, p.nickname AS nick, p.avatar_url AS av, p.cover_path AS capa,
           p.city AS cid, p.about AS sob, p.interests AS ints, p.goals AS metas,
           p.places AS lugs, p.looking_for AS proc, p.person_verified AS ver,
           ARRAY(SELECT unnest(p.interests) INTERSECT SELECT unnest(e.interests)) AS comum,
           (cardinality(ARRAY(SELECT unnest(p.interests) INTERSECT SELECT unnest(e.interests))) * 2
            + cardinality(ARRAY(SELECT unnest(p.goals) INTERSECT SELECT unnest(e.goals)))
            + CASE WHEN p.city = e.city AND p.city <> '' THEN 1 ELSE 0 END)::int AS afin,
           (p.city = e.city AND p.city <> '') AS mesma,
           EXISTS (SELECT 1 FROM public.curtidas c WHERE c.de = p.id AND c.para = e.id AND c.resposta = 'sim') AS curtida,
           p.cover_x AS cx, p.cover_y AS cy, p.avatar_x AS ax, p.avatar_y AS ay
    FROM public.profiles p, eu e
    WHERE p.id <> e.id
      AND p.profile_mode = 'publico'
      AND NOT p.is_business
      AND NOT public.is_blocked_between(e.id, p.id)
      AND NOT EXISTS (SELECT 1 FROM public.curtidas c WHERE c.de = e.id AND c.para = p.id)
      AND NOT EXISTS (SELECT 1 FROM public.connections k WHERE k.status = 'aceita'
            AND ((k.requester_id = e.id AND k.addressee_id = p.id)
              OR (k.addressee_id = e.id AND k.requester_id = p.id)))
    ORDER BY curtida DESC, afin DESC, p.created_at DESC
    LIMIT least(_restante, greatest(coalesce(_limite, 20), 1), 50)
  ),
  marcadas AS (
    INSERT INTO public.perfil_visto (user_id, visto_id)
    SELECT auth.uid(), pacote.uid FROM pacote
    ON CONFLICT (user_id, visto_id, dia) DO NOTHING
    RETURNING visto_id
  )
  SELECT uid, nick, av, capa, cid, sob, ints, metas, lugs, proc, ver, comum, afin, mesma,
         curtida, cx, cy, ax, ay
    FROM pacote;
END $$;
REVOKE ALL ON FUNCTION public.pessoas_para_combinar(integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.pessoas_para_combinar(integer) TO authenticated;

/** Quanto falta hoje, para a tela avisar bonito em vez de fingir que acabou a cidade. */
CREATE OR REPLACE FUNCTION public.perfis_do_dia()
RETURNS TABLE (teto integer, vistos integer, restantes integer, pro boolean)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH t AS (SELECT CASE WHEN public.tem_premium(auth.uid()) THEN 9 ELSE 3 END AS limite,
                    public.tem_premium(auth.uid()) AS eh_pro),
       c AS (SELECT count(DISTINCT v.visto_id)::int AS n FROM public.perfil_visto v
             WHERE v.user_id = auth.uid() AND v.dia = (now() AT TIME ZONE 'America/Sao_Paulo')::date)
  SELECT t.limite, c.n, greatest(t.limite - c.n, 0), t.eh_pro
  FROM t, c WHERE auth.uid() IS NOT NULL
$$;
REVOKE ALL ON FUNCTION public.perfis_do_dia() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.perfis_do_dia() TO authenticated;

-- ---------------------------------------------------------------------------
-- 4. Pippins de presente valem 90 dias. Pippin comprado não vence.
-- ---------------------------------------------------------------------------

ALTER TABLE public.credit_ledger ADD COLUMN IF NOT EXISTS expira_em timestamptz;

-- O que já está no extrato: presente e prêmio passam a ter validade contada
-- do dia em que entraram; compra segue sem validade.
UPDATE public.credit_ledger
   SET expira_em = created_at + interval '90 days'
 WHERE amount > 0 AND expira_em IS NULL AND reason NOT LIKE 'Compra de%';

/** Baixa o que venceu. Quem gasta, gasta primeiro o que vence: por isso o
 *  gasto só morde Pippin sem validade (compra) depois de comer o que vence. */
CREATE OR REPLACE FUNCTION public.varre_meus_pippins()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _quem uuid := auth.uid(); _vencidos integer; _gastos integer;
        _sem_validade integer; _ja_baixados integer; _debitar integer; _saldo integer;
BEGIN
  IF _quem IS NULL THEN RETURN 0; END IF;
  SELECT coalesce(sum(amount), 0) INTO _vencidos FROM public.credit_ledger
   WHERE user_id = _quem AND amount > 0 AND expira_em IS NOT NULL AND expira_em <= now();
  IF _vencidos = 0 THEN RETURN 0; END IF;
  SELECT coalesce(-sum(amount), 0) INTO _gastos FROM public.credit_ledger
   WHERE user_id = _quem AND amount < 0 AND reason <> 'Pippins vencidos';
  SELECT coalesce(sum(amount), 0) INTO _sem_validade FROM public.credit_ledger
   WHERE user_id = _quem AND amount > 0 AND expira_em IS NULL;
  SELECT coalesce(-sum(amount), 0) INTO _ja_baixados FROM public.credit_ledger
   WHERE user_id = _quem AND reason = 'Pippins vencidos';
  _debitar := greatest(0, _vencidos - greatest(0, _gastos - _sem_validade) - _ja_baixados);
  SELECT balance INTO _saldo FROM public.credit_accounts WHERE user_id = _quem;
  _debitar := least(coalesce(_saldo, 0), _debitar);
  IF _debitar < 1 THEN RETURN 0; END IF;
  UPDATE public.credit_accounts SET balance = balance - _debitar, updated_at = now()
   WHERE user_id = _quem;
  INSERT INTO public.credit_ledger (user_id, amount, reason, actor_id)
  VALUES (_quem, -_debitar, 'Pippins vencidos', _quem);
  RETURN _debitar;
END $$;
revoke all on function public.varre_meus_pippins() from public, anon;
grant execute on function public.varre_meus_pippins() to authenticated;

/** Saldo de verdade (já varrido) e o que está para vencer, para a carteira avisar. */
CREATE OR REPLACE FUNCTION public.saldo_pippins()
RETURNS TABLE (saldo integer, a_vencer integer, vence_em timestamptz)
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public AS $$
DECLARE _saldo integer;
BEGIN
  PERFORM public.varre_meus_pippins();
  SELECT coalesce((SELECT ca.balance FROM public.credit_accounts ca WHERE ca.user_id = auth.uid()), 0)
    INTO _saldo;
  RETURN QUERY
  SELECT _saldo,
         least(_saldo, coalesce((
           SELECT sum(l.amount) FROM public.credit_ledger l
           WHERE l.user_id = auth.uid() AND l.amount > 0
             AND l.expira_em > now() AND l.expira_em <= now() + interval '30 days'), 0)::int),
         (SELECT min(l.expira_em) FROM public.credit_ledger l
           WHERE l.user_id = auth.uid() AND l.amount > 0 AND l.expira_em > now());
END $$;
revoke all on function public.saldo_pippins() from public, anon;
grant execute on function public.saldo_pippins() to authenticated;

-- Boas-vindas e prêmio de convite nascem com validade.
CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
begin
  insert into public.profiles(id, nickname) values (new.id, left(coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(new.email,'@',1), ''),30)) on conflict do nothing;
  insert into public.credit_accounts(user_id, balance) values (new.id, 10) on conflict (user_id) do nothing;
  insert into public.credit_ledger(user_id, amount, reason, actor_id, expira_em)
    select new.id, 10, 'Presente de boas-vindas: 10 Pippins', new.id, now() + interval '90 days'
    where not exists (select 1 from public.credit_ledger l where l.user_id = new.id and l.reason like 'Presente de boas-vindas%');
  insert into public.user_roles(user_id, role) values (new.id, 'user') on conflict do nothing;
  if lower(new.email) = 'netnommi@gmail.com' and new.email_confirmed_at is not null then
    insert into public.user_roles(user_id, role) values (new.id, 'admin') on conflict do nothing;
  end if;
  return new;
end $$;
revoke execute on function public.handle_new_user() from public, anon, authenticated;

CREATE OR REPLACE FUNCTION public.premiar_convite_se_vingou(_quem uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE dono uuid; codigo text;
BEGIN
  IF _quem IS NULL THEN RETURN; END IF;
  SELECT i.owner_id, i.code INTO dono, codigo FROM public.invites i
   WHERE i.used_by = _quem AND i.premiado_em IS NULL LIMIT 1;
  IF dono IS NULL THEN RETURN; END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = _quem AND coalesce(p.nickname,'') <> '' AND NOT coalesce(p.is_test,false)
  ) THEN RETURN; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.teia_members m WHERE m.user_id = _quem) THEN RETURN; END IF;
  -- Marca antes de pagar: se dois gatilhos chegarem juntos, só um passa.
  UPDATE public.invites SET premiado_em = now() WHERE code = codigo AND premiado_em IS NULL;
  IF NOT FOUND THEN RETURN; END IF;
  INSERT INTO public.credit_accounts(user_id, balance) VALUES (dono, 0) ON CONFLICT (user_id) DO NOTHING;
  UPDATE public.credit_accounts SET balance = balance + 2, updated_at = now() WHERE user_id = dono;
  INSERT INTO public.credit_ledger(user_id, amount, reason, actor_id, expira_em)
    VALUES (dono, 2, 'Convite que vingou: +2 Pippins', _quem, now() + interval '90 days');
END $$;
revoke all on function public.premiar_convite_se_vingou(uuid) from public, anon, authenticated;

-- Figurinha desconta depois de varrer o que venceu.
CREATE OR REPLACE FUNCTION public.gastar_figurinha()
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
begin
  if auth.uid() is null then return false; end if;
  if public.tem_premium(auth.uid()) then return true; end if;
  perform public.varre_meus_pippins();
  update public.credit_accounts set balance = balance - 1, updated_at = now()
   where user_id = auth.uid() and balance >= 1;
  if not found then return false; end if;
  insert into public.credit_ledger(user_id, amount, reason, actor_id)
    values (auth.uid(), -1, 'Figurinha do Pippo', auth.uid());
  return true;
end $$;
revoke all on function public.gastar_figurinha() from public, anon;
grant execute on function public.gastar_figurinha() to authenticated;

-- ---------------------------------------------------------------------------
-- Regra da casa: tabela nova na exportação e no apagar, por inteiro.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.meus_dados()
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT jsonb_build_object(
    'gerado_em', now(),
    'perfil', (SELECT to_jsonb(p) - 'is_test' FROM public.profiles p WHERE p.id = auth.uid()),
    'aceites', (SELECT coalesce(jsonb_agg(to_jsonb(a)), '[]'::jsonb) FROM public.aceites a WHERE a.user_id = auth.uid()),
    'amizades', (SELECT coalesce(jsonb_agg(to_jsonb(c)), '[]'::jsonb) FROM public.connections c
                  WHERE c.requester_id = auth.uid() OR c.addressee_id = auth.uid()),
    'sigo', (SELECT coalesce(jsonb_agg(f.followed_id), '[]'::jsonb) FROM public.follows f WHERE f.follower_id = auth.uid()),
    'me_seguem', (SELECT coalesce(jsonb_agg(f.follower_id), '[]'::jsonb) FROM public.follows f WHERE f.followed_id = auth.uid()),
    'tribos', (SELECT coalesce(jsonb_agg(to_jsonb(m)), '[]'::jsonb) FROM public.teia_members m WHERE m.user_id = auth.uid()),
    'tribos_vistas', (SELECT coalesce(jsonb_agg(to_jsonb(tv)), '[]'::jsonb) FROM public.tribo_vista tv WHERE tv.user_id = auth.uid()),
    'perfis_que_vi', (SELECT coalesce(jsonb_agg(to_jsonb(pv)), '[]'::jsonb) FROM public.perfil_visto pv WHERE pv.user_id = auth.uid()),
    'lembrancas', (SELECT coalesce(jsonb_agg(to_jsonb(lb)), '[]'::jsonb) FROM public.lembrancas lb WHERE lb.user_id = auth.uid()),
    'mensagens_enviadas', (SELECT coalesce(jsonb_agg(to_jsonb(d)), '[]'::jsonb) FROM public.direct_messages d WHERE d.sender_id = auth.uid()),
    'recados_na_tribo', (SELECT coalesce(jsonb_agg(to_jsonb(t)), '[]'::jsonb) FROM public.teia_messages t WHERE t.sender_id = auth.uid()),
    'publicacoes', (SELECT coalesce(jsonb_agg(to_jsonb(po)), '[]'::jsonb) FROM public.posts po WHERE po.author_id = auth.uid()),
    'comentarios', (SELECT coalesce(jsonb_agg(to_jsonb(pc)), '[]'::jsonb) FROM public.post_comments pc WHERE pc.author_id = auth.uid()),
    'mural', (SELECT coalesce(jsonb_agg(to_jsonb(w)), '[]'::jsonb) FROM public.wall_items w WHERE w.target_id = auth.uid() OR w.author_id = auth.uid()),
    'stories', (SELECT coalesce(jsonb_agg(to_jsonb(s)), '[]'::jsonb) FROM public.stories s WHERE s.author_id = auth.uid()),
    'selos_que_recebi', (SELECT coalesce(jsonb_agg(sl.selo), '[]'::jsonb) FROM public.selos sl WHERE sl.dono = auth.uid()),
    'radar', (SELECT coalesce(jsonb_agg(to_jsonb(r)), '[]'::jsonb) FROM public.radar_presence r WHERE r.user_id = auth.uid()),
    'meus_lugares', (SELECT coalesce(jsonb_agg(to_jsonb(ml)), '[]'::jsonb) FROM public.meus_lugares ml WHERE ml.user_id = auth.uid()),
    'dias_em_que_abri_o_app', (SELECT coalesce(jsonb_agg(ac.dia ORDER BY ac.dia), '[]'::jsonb) FROM public.acessos ac WHERE ac.user_id = auth.uid()),
    'estrelas', (SELECT coalesce(jsonb_agg(to_jsonb(sa)), '[]'::jsonb) FROM public.star_accounts sa WHERE sa.user_id = auth.uid()),
    'embaixadora', (SELECT to_jsonb(e) FROM public.embaixadoras e WHERE e.user_id = auth.uid())
  )
  WHERE auth.uid() IS NOT NULL
$$;
