-- Rollback: restaurar virar_embaixadora da 0039 para retomar concessões futuras.
-- Não remove benefícios nem registros existentes. Idempotente.
-- Decisão 04/11: não conceder título/Pro automático para cadastros novos.
CREATE OR REPLACE FUNCTION public.virar_embaixadora(_quem uuid)
RETURNS boolean LANGUAGE sql SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT EXISTS (SELECT 1 FROM public.embaixadoras WHERE user_id = _quem)
$$;
