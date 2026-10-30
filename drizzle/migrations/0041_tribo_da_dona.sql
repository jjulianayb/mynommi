-- A dona manda na tribo dela.
--
-- Pedido da Ju: quem cria a tribo escreve as próprias regras, a missão, os
-- valores e a visão; escolhe a capa e a figurinha; decide se todo mundo cria
-- rolê ou só ela; e tem um link da tribo para divulgar nas redes.
--
-- Duas coisas que descobri construindo isto, e que mudam o tamanho do trabalho:
--
-- 1. **O rolê não era da tribo.** Rolê e tribo são a mesma tabela (`teias`,
--    com `kind`), e não havia nenhuma ligação entre os dois. Então "quem cria
--    rolê nesta tribo" não tinha onde se apoiar: todo rolê era solto. Daí
--    `tribo_id`.
-- 2. A aba Eventos da tribo mostrava uma meta de exemplo ("Próxima parada: day
--    spa", com pontos) para conta real. Sobra da apresentação, igual aos
--    cartões de rolê que já saíram do Início.

ALTER TABLE public.teias
  ADD COLUMN IF NOT EXISTS missao text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS valores text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS visao text NOT NULL DEFAULT '',
  -- Id de figurinha, conferido contra o catálogo na tela. Nunca CSS, nunca
  -- endereço de imagem: id desconhecido simplesmente não desenha nada.
  ADD COLUMN IF NOT EXISTS figurinha text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS who_roles text NOT NULL DEFAULT 'todos',
  -- O rolê que nasce dentro de uma tribo aponta para ela.
  ADD COLUMN IF NOT EXISTS tribo_id bigint REFERENCES public.teias (id) ON DELETE SET NULL,
  -- O link público é **escolha da dona**, e nasce desligado. Sem isso, qualquer
  -- pessoa poderia varrer os números de id e descobrir tribo por tribo.
  ADD COLUMN IF NOT EXISTS link_publico boolean NOT NULL DEFAULT false;

ALTER TABLE public.teias DROP CONSTRAINT IF EXISTS teias_who_roles_ok;
ALTER TABLE public.teias ADD CONSTRAINT teias_who_roles_ok
  CHECK (who_roles IN ('todos', 'criadora'));

CREATE INDEX IF NOT EXISTS teias_tribo_id ON public.teias (tribo_id) WHERE tribo_id IS NOT NULL;

-- Permissão por coluna, como as outras: a permissão por tabela abriria
-- `official` e `person_verified` junto, e tribo oficial só a administração marca.
GRANT UPDATE (missao, valores, visao, figurinha, who_roles, link_publico)
  ON public.teias TO authenticated;
GRANT INSERT (missao, valores, visao, figurinha, who_roles, tribo_id, link_publico)
  ON public.teias TO authenticated;
GRANT SELECT (missao, valores, visao, figurinha, who_roles, tribo_id, link_publico)
  ON public.teias TO authenticated, anon;

-- Quem pode criar rolê nesta tribo.
--
-- A trava é do banco, não da tela: a política de INSERT confere isto, então
-- não adianta a tela esquecer de esconder o botão.
CREATE OR REPLACE FUNCTION public.pode_criar_role_na_tribo(_tribo bigint, _quem uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.teias t
     WHERE t.id = _tribo
       AND (
         t.created_by = _quem
         OR (t.who_roles = 'todos'
             AND EXISTS (SELECT 1 FROM public.teia_members m
                          WHERE m.teia_key = t.id::text AND m.user_id = _quem))
       )
  )
$$;

-- A política de criação passa a conferir o rolê dentro de tribo.
DROP POLICY IF EXISTS "Cria a própria teia" ON public.teias;
CREATE POLICY "Cria a própria teia"
  ON public.teias FOR INSERT
  WITH CHECK (
    created_by = auth.uid()
    AND (tribo_id IS NULL OR public.pode_criar_role_na_tribo(tribo_id, auth.uid()))
  );

-- Os rolês de uma tribo, para quem é da tribo.
CREATE OR REPLACE FUNCTION public.roles_da_tribo(_tribo bigint)
RETURNS TABLE (
  id bigint, name text, place text, city text, when_text text,
  starts_at timestamptz, capacity integer, going_count integer,
  i_am_going boolean, creator_nickname text, i_am_creator boolean, ja_passou boolean
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT r.id, r.name, r.place, r.city, r.when_text, r.starts_at, r.capacity,
         (SELECT count(*)::int FROM public.teia_rsvps v WHERE v.teia_id = r.id),
         EXISTS (SELECT 1 FROM public.teia_rsvps v WHERE v.teia_id = r.id AND v.user_id = auth.uid()),
         r.creator_nickname,
         r.created_by = auth.uid(),
         r.starts_at IS NOT NULL AND r.starts_at < now()
  FROM public.teias r
  WHERE r.tribo_id = _tribo
    AND r.kind = 'role'
    AND (NOT r.is_test OR public.ve_contas_de_teste())
    -- Só quem é da tribo vê os rolês dela.
    AND (EXISTS (SELECT 1 FROM public.teia_members m
                  WHERE m.teia_key = _tribo::text AND m.user_id = auth.uid())
         OR EXISTS (SELECT 1 FROM public.teias t WHERE t.id = _tribo AND t.created_by = auth.uid()))
  ORDER BY (r.starts_at IS NULL), r.starts_at ASC
  LIMIT 100
$$;

-- A página pública da tribo: o link que a dona divulga nas redes.
--
-- Chamável por quem não tem conta, de propósito: link que só abre para quem já
-- está dentro não serve para divulgar nada.
--
-- Três travas:
--   - só responde se a dona ligou o link (`link_publico`),
--   - **nunca** responde para tribo sensível (política, religião, orientação):
--     uma página pública dessas expõe o assunto de quem está lá,
--   - não devolve membro nenhum, nem quem criou em caso de tribo oficial.
CREATE OR REPLACE FUNCTION public.tribo_publica(_id bigint)
RETURNS TABLE (
  id bigint, name text, city text, about text, rule text,
  missao text, valores text, visao text, figurinha text,
  cover_path text, cover_x smallint, cover_y smallint,
  quantas integer, entrada text, audience text, oficial boolean, dona text
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT t.id, t.name, t.city, t.about, t.rule,
         t.missao, t.valores, t.visao, t.figurinha,
         t.cover_path, t.cover_x, t.cover_y,
         (SELECT count(*)::int FROM public.teia_members m WHERE m.teia_key = t.id::text),
         t.entrada, t.audience, t.official,
         CASE WHEN t.official THEN 'nommi' ELSE t.creator_nickname END
  FROM public.teias t
  WHERE t.id = _id
    AND t.kind = 'teia'
    AND t.link_publico
    AND NOT coalesce(t.sensivel, false)
    AND NOT coalesce(t.is_test, false)
$$;

GRANT EXECUTE ON FUNCTION public.tribo_publica(bigint) TO anon, authenticated;
