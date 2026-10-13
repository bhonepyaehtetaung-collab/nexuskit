import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { clientIp, isSameOrigin, rateLimit } from "@/lib/server/guard";

/** POST /api/promo — check a promo code. Body: { code: string } */
export async function POST(request: Request) {
  if (!isSameOrigin(request)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  // Tight limit so codes cannot be guessed by brute force.
  if (!rateLimit(`promo:${clientIp(request)}`, 10, 10 * 60 * 1000)) {
    return NextResponse.json({ error: "အကြိမ်များလွန်းနေပါသည်။ ခဏနေမှ ပြန်ကြိုးစားပါ။" }, { status: 429 });
  }

  let code = "";
  try {
    const body = await request.json();
    code = typeof body?.code === "string" ? body.code.trim().slice(0, 40) : "";
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  if (!code) return NextResponse.json({ error: "Promo code ထည့်ပါ။" }, { status: 400 });

  const supabase = createClient();
  const { data, error } = await supabase.rpc("check_promo_code", { p_code: code });
  if (error) {
    console.error("check_promo_code failed", error);
    return NextResponse.json({ error: "ခဏနေ ပြန်ကြိုးစားပါ။" }, { status: 500 });
  }
  if (data === null || data === undefined) {
    return NextResponse.json({ error: "Promo code မှားနေပါသည်။" }, { status: 404 });
  }
  return NextResponse.json({ code: code.toUpperCase(), discountPercent: Number(data) });
}
