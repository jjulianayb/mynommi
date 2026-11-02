-- Privacidade: o selo é público, o número é dela.
--
-- Decisão da Ju (01/11): o selo de embaixadora é igual para todas e ninguém
-- vê número, ordem de chegada, nem quem é admin. Na 0039 a tabela inteira
-- (user_id, numero, desde) ficou legível por qualquer pessoa logada — dava
-- para baixar a lista, ver a nº 1 e cruzar com perfis. E has_role() deixava
-- qualquer logada perguntar "esse uuid é admin?" até achar as donas.
--
-- Três fechaduras, nenhuma mudança de cara para o app:
--
-- 1. A tabela sai da API. O selo continua aparecendo nos perfis, mas quem
--    pergunta é uma função que só responde "é" ou "não é". Número e desde
--    não saem do banco.
REVOKE SELECT ON public.embaixadoras FROM anon, authenticated;

-- É embaixadora? Só isso. A 0039 continua valendo para quem chama de dentro
-- do banco (meu_titulo, virar_embaixadora), que é definer e não usa a API.
CREATE OR REPLACE FUNCTION public.e_embaixadora(_quem uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT EXISTS (SELECT 1 FROM public.embaixadoras WHERE user_id = _quem)
$$;
REVOKE ALL ON FUNCTION public.e_embaixadora(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.e_embaixadora(uuid) TO authenticated;

-- 2. has_role só fala da própria pessoa. Toda policy, gatilho e tela que já
--    existia pergunta "eu sou admin?" (auth.uid()) e continua igual. O que
--    morre é a pergunta "fulana é admin?": fora de contexto de servidor
--    (auth.uid() nulo = service role, gatilho de cadastro), uuid dos outros
--    devolve falso. Assim ninguém enumera as donas pela API.
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT (auth.uid() IS NULL OR _user_id IS NOT DISTINCT FROM auth.uid())
     AND EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

-- 3. tem_premium e convites_que_vingaram viram assunto interno. Nenhuma tela
--    chama as duas direto (quem usa é meu_titulo e os gatilhos, todos
--    definer), então tirar o EXECUTE da API não muda nada no app — só fecha
--    a consulta "premium de fulana" e "convites de fulana" pela API.
REVOKE EXECUTE ON FUNCTION public.tem_premium(uuid) FROM public, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.convites_que_vingaram(uuid) FROM public, anon, authenticated;
