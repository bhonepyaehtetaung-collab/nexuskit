// Server-side only. Running campaigns and best sellers for store pages.
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Campaign } from "../promotions";

/** Never throws: before promotions.sql is run these simply come back empty. */
export async function storeExtras(supabase: SupabaseClient): Promise<{ campaigns: Campaign[]; popular: string[] }> {
  const [c, p] = await Promise.all([
    supabase.from("campaigns").select("*").order("discount_percent", { ascending: false }),
    // GET so the response can sit in the data cache like the other reads.
    supabase.rpc("popular_products", { p_limit: 60 }, { get: true }),
  ]);
  return {
    campaigns: c.error ? [] : ((c.data || []) as Campaign[]),
    popular: p.error ? [] : ((p.data || []) as { product_id: string }[]).map((r) => String(r.product_id)),
  };
}
