-- O ciclo que fecha o produto: fui ao rolê, confirmo presença, ganho estrela.
-- A estrela nunca é escrita pelo navegador: só por função do servidor, com histórico.

CREATE TABLE public.star_accounts (
  user_id uuid PRIMARY KEY,
  balance integer NOT NULL DEFAULT 0 CHECK (balance >= 0),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.star_accounts TO authenticated;
GRANT ALL ON public.star_accounts TO service_role;
ALTER TABLE public.star_accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Ver as minhas estrelas" ON public.star_accounts FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE TABLE public.star_ledger (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  amount integer NOT NULL CHECK (amount <> 0),
  reason text NOT NULL CHECK (reason IN ('presenca','anfitriao','primeira_tribo','resgate','ajuste')),
  teia_id bigint,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX star_ledger_user_idx ON public.star_ledger (user_id, created_at DESC);
GRANT SELECT ON public.star_ledger TO authenticated;
GRANT ALL ON public.star_ledger TO service_role;
ALTER TABLE public.star_ledger ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Ver o meu histórico de estrelas" ON public.star_ledger FOR SELECT TO authenticated USING (user_id = auth.uid());

-- Presença: quem foi diz que foi, e outra pessoa confirma. Sem confirmação, não vira estrela.
CREATE TABLE public.attendances (
  teia_id bigint NOT NULL REFERENCES public.teias(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  declared_at timestamptz NOT NULL DEFAULT now(),
  confirmed_by uuid,
  confirmed_at timestamptz,
  rewarded boolean NOT NULL DEFAULT false,
  PRIMARY KEY (teia_id, user_id)
);
CREATE INDEX attendances_teia_idx ON public.attendances (teia_id);
GRANT SELECT, INSERT ON public.attendances TO authenticated;
GRANT ALL ON public.attendances TO service_role;
ALTER TABLE public.attendances ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.estive_no_role(_teia bigint, _user uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.attendances a WHERE a.teia_id = _teia AND a.user_id = _user)
$$;
REVOKE ALL ON FUNCTION public.estive_no_role(bigint, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.estive_no_role(bigint, uuid) TO authenticated;


CREATE POLICY "Ver presenças do rolê em que eu estive" ON public.attendances FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_teia_creator(teia_id, auth.uid())
      OR public.estive_no_role(teia_id, auth.uid()));
-- Só declara quem disse que ia, e só depois que o rolê começou (até 7 dias depois).
CREATE OR REPLACE FUNCTION public.pode_declarar_presenca(_teia bigint, _user uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.teia_rsvps r WHERE r.teia_id = _teia AND r.user_id = _user)
     AND EXISTS (SELECT 1 FROM public.teias t WHERE t.id = _teia AND t.kind = 'role'
                   AND t.starts_at IS NOT NULL AND t.starts_at <= now()
                   AND t.starts_at > now() - interval '7 days')
$$;
REVOKE ALL ON FUNCTION public.pode_declarar_presenca(bigint, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.pode_declarar_presenca(bigint, uuid) TO authenticated;

CREATE POLICY "Dizer que estive lá" ON public.attendances FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND confirmed_by IS NULL AND NOT rewarded
    AND public.pode_declarar_presenca(teia_id, auth.uid()));

-- Limite semanal: no máximo 3 rolês premiados por semana, e conta com pelo menos 3 dias de vida.
CREATE OR REPLACE FUNCTION public.pode_ganhar_estrela(_user uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT (SELECT count(*) FROM public.star_ledger
           WHERE user_id = _user AND reason = 'presenca' AND created_at > now() - interval '7 days') < 3
     AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = _user AND p.created_at < now() - interval '3 days')
$$;
REVOKE ALL ON FUNCTION public.pode_ganhar_estrela(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.pode_ganhar_estrela(uuid) TO authenticated;

-- Creditar estrela: só por aqui, sempre com linha no histórico.
CREATE OR REPLACE FUNCTION public.creditar_estrela(_user uuid, _amount integer, _reason text, _teia bigint)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.star_accounts (user_id, balance) VALUES (_user, 0) ON CONFLICT (user_id) DO NOTHING;
  UPDATE public.star_accounts SET balance = balance + _amount, updated_at = now() WHERE user_id = _user;
  INSERT INTO public.star_ledger (user_id, amount, reason, teia_id) VALUES (_user, _amount, _reason, _teia);
END $$;
REVOKE ALL ON FUNCTION public.creditar_estrela(uuid, integer, text, bigint) FROM PUBLIC, anon, authenticated;

-- Confirmar que alguém esteve lá. Quem confirma: quem organizou, ou outra pessoa que também esteve.
CREATE OR REPLACE FUNCTION public.confirmar_presenca(_teia bigint, _quem uuid)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE eu uuid := auth.uid(); linha public.attendances; organiza boolean; estive boolean;
BEGIN
  IF eu IS NULL OR eu = _quem THEN RETURN 'nao_pode'; END IF;
  SELECT * INTO linha FROM public.attendances WHERE teia_id = _teia AND user_id = _quem;
  IF linha IS NULL THEN RETURN 'sem_declaracao'; END IF;
  IF linha.confirmed_by IS NOT NULL THEN RETURN 'ja_confirmada'; END IF;
  organiza := public.is_teia_creator(_teia, eu);
  estive := EXISTS (SELECT 1 FROM public.attendances a WHERE a.teia_id = _teia AND a.user_id = eu AND a.confirmed_by IS NOT NULL);
  IF NOT organiza AND NOT estive THEN RETURN 'nao_pode'; END IF;
  UPDATE public.attendances SET confirmed_by = eu, confirmed_at = now() WHERE teia_id = _teia AND user_id = _quem;
  IF public.pode_ganhar_estrela(_quem) THEN
    UPDATE public.attendances SET rewarded = true WHERE teia_id = _teia AND user_id = _quem;
    PERFORM public.creditar_estrela(_quem, 1, 'presenca', _teia);
    PERFORM public.avisar(_quem, 'quero_ir', eu, _teia, NULL, 'Sua presença foi confirmada. Você ganhou uma estrela');
    RETURN 'estrela';
  END IF;
  PERFORM public.avisar(_quem, 'quero_ir', eu, _teia, NULL, 'Sua presença foi confirmada');
  RETURN 'confirmada';
END $$;
REVOKE ALL ON FUNCTION public.confirmar_presenca(bigint, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.confirmar_presenca(bigint, uuid) TO authenticated;

-- A primeira pessoa a declarar presença precisa de alguém para confirmar: quem organiza confirma a si mesmo.
CREATE OR REPLACE FUNCTION public.presenca_do_anfitriao(_teia bigint)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE eu uuid := auth.uid();
BEGIN
  IF eu IS NULL OR NOT public.is_teia_creator(_teia, eu) THEN RETURN 'nao_pode'; END IF;
  INSERT INTO public.attendances (teia_id, user_id, confirmed_by, confirmed_at)
  VALUES (_teia, eu, eu, now()) ON CONFLICT (teia_id, user_id)
  DO UPDATE SET confirmed_by = eu, confirmed_at = now();
  RETURN 'confirmada';
END $$;
REVOKE ALL ON FUNCTION public.presenca_do_anfitriao(bigint) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.presenca_do_anfitriao(bigint) TO authenticated;

-- Quanto tenho e o que aconteceu.
CREATE OR REPLACE FUNCTION public.minhas_estrelas()
RETURNS TABLE (saldo integer, ganhas_semana integer, presencas integer)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE((SELECT balance FROM public.star_accounts WHERE user_id = auth.uid()), 0),
         COALESCE((SELECT sum(amount)::int FROM public.star_ledger
                    WHERE user_id = auth.uid() AND amount > 0 AND created_at > now() - interval '7 days'), 0),
         COALESCE((SELECT count(*)::int FROM public.attendances
                    WHERE user_id = auth.uid() AND confirmed_by IS NOT NULL), 0)
  WHERE auth.uid() IS NOT NULL
$$;
REVOKE ALL ON FUNCTION public.minhas_estrelas() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.minhas_estrelas() TO authenticated;
