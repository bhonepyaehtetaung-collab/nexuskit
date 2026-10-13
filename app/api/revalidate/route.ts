import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { createClient } from "@/utils/supabase/server";
import { isSameOrigin } from "@/lib/server/guard";
import { CATALOG_TAG } from "@/lib/server/public-db";

/** POST /api/revalidate — staff only. Refresh cached store data after an admin edit. */
export async function POST(request: Request) {
  if (!isSameOrigin(request)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const supabase = createClient();
  const { data: auth } = await supabase.auth.getUser();
  const { data: role } = auth.user ? await supabase.rpc("staff_role") : { data: null };
  if (!auth.user || typeof role !== "string") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  revalidateTag(CATALOG_TAG, { expire: 0 });
  return NextResponse.json({ ok: true });
}
