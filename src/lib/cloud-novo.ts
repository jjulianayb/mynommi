import type { SupabaseClient } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

/**
 * Cliente sem tipos para as tabelas que ainda não estão em src/integrations/supabase/types.ts
 * (stories, story_views, saved_stickers e as colunas de capa). Assim que os tipos forem
 * regenerados depois da migração 0014, troque `novo` por `supabase` nestes arquivos.
 */
export const novo = supabase as unknown as SupabaseClient;
