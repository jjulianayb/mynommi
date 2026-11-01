-- Fecha brecha da regra de tribo: is_test=true só vale para conta de teste.
-- Antes, qualquer conta podia marcar is_test e pular a trava Premium e a cota
-- de uma tribo por pessoa. Agora a marca vira false e a tribo entra na regra.
-- (Encontrada no teste ao vivo dos créditos em 01/11/2026.)
--
-- Aplicada manualmente pelo SQL editor do Lovable Cloud em 01/11/2026.

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
    RAISE EXCEPTION 'Criar tribo é Premium.' USING ERRCODE = '42501';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.teias t
    WHERE t.created_by = NEW.created_by AND t.kind = 'teia' AND NOT coalesce(t.is_test, false)
  ) THEN
    RAISE EXCEPTION 'Uma tribo por pessoa.' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END $$;
