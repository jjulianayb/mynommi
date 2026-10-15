CREATE TABLE public.connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id uuid NOT NULL,
  addressee_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente','aceita')),
  created_at timestamptz NOT NULL DEFAULT now(),
  accepted_at timestamptz,
  CHECK (requester_id <> addressee_id)
);
CREATE UNIQUE INDEX connections_pair_uniq ON public.connections (LEAST(requester_id, addressee_id), GREATEST(requester_id, addressee_id));
GRANT SELECT, INSERT, UPDATE, DELETE ON public.connections TO authenticated;
GRANT ALL ON public.connections TO service_role;
ALTER TABLE public.connections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Ver as próprias conexões" ON public.connections FOR SELECT TO authenticated USING (requester_id = auth.uid() OR addressee_id = auth.uid());
CREATE POLICY "Pedir conexão" ON public.connections FOR INSERT TO authenticated WITH CHECK (requester_id = auth.uid() AND status = 'pendente');
CREATE POLICY "Aceitar pedido recebido" ON public.connections FOR UPDATE TO authenticated USING (addressee_id = auth.uid()) WITH CHECK (addressee_id = auth.uid() AND status = 'aceita');
CREATE POLICY "Desfazer conexão" ON public.connections FOR DELETE TO authenticated USING (requester_id = auth.uid() OR addressee_id = auth.uid());
ALTER PUBLICATION supabase_realtime ADD TABLE public.connections;