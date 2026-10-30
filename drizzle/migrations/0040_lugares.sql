-- O radar fora de Belo Horizonte.
--
-- O problema: o catálogo de lugares do radar eram 20 endereços escritos à mão,
-- todos em BH. Quem liga o radar em João Monlevade, Rio Piracicaba, São Paulo,
-- Florianópolis ou Rio de Janeiro não recebia sugestão nenhuma e lia um texto
-- pedindo desculpa. E a Ju, em BH, via sempre o mesmo lugar porque a lista não
-- tem nada perto do bairro dela.
--
-- A saída não é escrever um catálogo do Brasil à mão: seria inventar dado e
-- envelheceria na semana seguinte. A saída é o radar aprender os lugares de
-- cada cidade com o que a nommi já tem de verdade:
--
--   1. os lugares dos rolês e das tribos (já são públicos, é o endereço do
--      encontro),
--   2. os lugares que a própria pessoa já usou antes.
--
-- O que **não** entra: lugar onde outra pessoa esteve. Alguém pode escrever
-- "Casa da Bia" no radar, e isso é a casa de alguém. Lugar de rolê é público
-- por natureza; lugar de presença de outra pessoa não é, nunca.

-- Os lugares de cada pessoa, para ela mesma.
-- Serve para reaparecerem os lugares de sempre: o café do trabalho, a praça
-- perto de casa. Dado dela, visível só para ela.
CREATE TABLE IF NOT EXISTS public.meus_lugares (
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  nome text NOT NULL,
  area text NOT NULL DEFAULT '',
  cidade text NOT NULL DEFAULT '',
  lat numeric,
  lng numeric,
  vezes integer NOT NULL DEFAULT 1,
  ultima_vez timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, nome)
);

ALTER TABLE public.meus_lugares ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Meus lugares são meus" ON public.meus_lugares;
CREATE POLICY "Meus lugares são meus"
  ON public.meus_lugares FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Posso apagar meu lugar" ON public.meus_lugares;
CREATE POLICY "Posso apagar meu lugar"
  ON public.meus_lugares FOR DELETE USING (user_id = auth.uid());

-- Quem escreve é o gatilho, não o cliente: assim não existe caminho de ligar
-- o radar que esqueça de guardar o lugar.
REVOKE ALL ON public.meus_lugares FROM anon, authenticated;
GRANT SELECT, DELETE ON public.meus_lugares TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.guardar_meu_lugar()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF coalesce(NEW.place_name,'') = '' OR NEW.place_name = 'Por aí' THEN RETURN NEW; END IF;
  INSERT INTO public.meus_lugares (user_id, nome, area, cidade, lat, lng)
  VALUES (NEW.user_id, NEW.place_name, coalesce(NEW.area,''), coalesce(NEW.city,''), NEW.lat, NEW.lng)
  ON CONFLICT (user_id, nome) DO UPDATE
    SET vezes = public.meus_lugares.vezes + 1,
        ultima_vez = now(),
        area = CASE WHEN excluded.area <> '' THEN excluded.area ELSE public.meus_lugares.area END,
        cidade = CASE WHEN excluded.cidade <> '' THEN excluded.cidade ELSE public.meus_lugares.cidade END,
        lat = coalesce(excluded.lat, public.meus_lugares.lat),
        lng = coalesce(excluded.lng, public.meus_lugares.lng);
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS radar_guarda_lugar ON public.radar_presence;
CREATE TRIGGER radar_guarda_lugar
AFTER INSERT OR UPDATE OF place_name ON public.radar_presence
FOR EACH ROW EXECUTE FUNCTION public.guardar_meu_lugar();

-- Os lugares que a pessoa já usou, do mais usado para o menos.
CREATE OR REPLACE FUNCTION public.meus_lugares_de_sempre(_limite integer DEFAULT 6)
RETURNS TABLE (nome text, area text, cidade text, vezes integer)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT l.nome, l.area, l.cidade, l.vezes
  FROM public.meus_lugares l
  WHERE l.user_id = auth.uid()
  ORDER BY l.ultima_vez DESC
  LIMIT greatest(1, least(20, coalesce(_limite, 6)))
$$;

-- Comparar cidade sem acento. A extensão `unaccent` não está instalada aqui, e
-- `translate` resolve o caso real: as pessoas escrevem "São Paulo", "sao paulo"
-- e "Sao Paulo", e é a mesma cidade.
CREATE OR REPLACE FUNCTION public.sem_acento(_t text)
RETURNS text LANGUAGE sql IMMUTABLE AS $$
  SELECT translate(coalesce(_t,''),
    'áàãâäéèêëíìîïóòõôöúùûüçñÁÀÃÂÄÉÈÊËÍÌÎÏÓÒÕÔÖÚÙÛÜÇÑ',
    'aaaaaeeeeiiiiooooouuuucnAAAAAEEEEIIIIOOOOOUUUUCN')
$$;

-- Os lugares de rolê e de tribo da cidade de quem pergunta.
--
-- Devolve **só o nome do lugar e a cidade**, nunca de qual tribo veio: dizer
-- "aqui teve o rolê da tribo tal" entregaria a existência de uma tribo
-- fechada para quem não é dela.
--
-- Compara cidade sem acento e sem maiúscula, porque "São Paulo", "sao paulo"
-- e "Sao Paulo" são a mesma cidade e as pessoas escrevem dos três jeitos.
CREATE OR REPLACE FUNCTION public.lugares_da_cidade(_cidade text, _limite integer DEFAULT 10)
RETURNS TABLE (nome text, cidade text, quantos integer)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  WITH alvo AS (
    SELECT lower(public.sem_acento(coalesce(nullif(trim(_cidade), ''),
      (SELECT p.city FROM public.profiles p WHERE p.id = auth.uid())))) AS c
  )
  SELECT t.place AS nome, max(t.city) AS cidade, count(*)::int AS quantos
  FROM public.teias t, alvo
  WHERE coalesce(t.place,'') <> ''
    AND NOT coalesce(t.is_test, false)
    AND alvo.c IS NOT NULL AND alvo.c <> ''
    AND lower(public.sem_acento(coalesce(t.city,''))) = alvo.c
  GROUP BY t.place
  ORDER BY count(*) DESC, max(t.created_at) DESC
  LIMIT greatest(1, least(30, coalesce(_limite, 10)))
$$;

-- Regra da casa: tabela nova com dado de pessoa entra nas duas funções, a que
-- exporta e a que apaga, no mesmo commit que a cria. Aqui só acrescento a
-- chave 'meus_lugares' e a linha do DELETE; o resto das duas funções é igual
-- ao que já estava, porque CREATE OR REPLACE troca a função inteira.
--
-- (Corpo completo aplicado junto desta migração; ver 0039 para o motivo de
-- copiar em vez de remendar.)
