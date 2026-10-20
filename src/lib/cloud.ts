import type { SupabaseClient } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

/**
 * Cliente da nuvem sem tipos gerados. As tabelas novas (posts, seguidores, mural, rolês,
 * bloqueios, denúncias) entram em types.ts só depois que a migração é aplicada; até lá o
 * cliente tipado recusaria os nomes. Quando types.ts for regenerado, dá para voltar a usar `supabase`.
 */
export const cloud = supabase as unknown as SupabaseClient;
