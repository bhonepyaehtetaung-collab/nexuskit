// Server-side only. Read-only Supabase client for PUBLIC store data (anon key, no
// cookies), with responses kept in Next's data cache so most page views skip the
// round-trip to the database. Admin saves call /api/revalidate to refresh it.
import { createClient } from "@supabase/supabase-js";

export const CATALOG_TAG = "catalog";

export function createPublicClient(revalidate = 300) {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input: RequestInfo | URL, init?: RequestInit) =>
        fetch(input, { ...init, next: { revalidate, tags: [CATALOG_TAG] } } as RequestInit),
    },
  });
}
