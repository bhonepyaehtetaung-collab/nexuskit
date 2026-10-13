import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { clientIp, friendlyDbError, isSameOrigin, rateLimit, validateSlip } from "@/lib/server/guard";
import { escapeHtml, notifyTelegram } from "@/lib/server/telegram";

/**
 * POST /api/orders/slip — a signed-in customer uploads the payment slip
 * for one of THEIR orders that is waiting for payment.
 * Body: multipart/form-data with `orderId` and `slip`.
 */
export async function POST(request: Request) {
  if (!isSameOrigin(request)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (!rateLimit(`slip:${clientIp(request)}`, 10, 10 * 60 * 1000)) {
    return NextResponse.json({ error: "အကြိမ်များလွန်းနေပါသည်။ ခဏနေမှ ပြန်ကြိုးစားပါ။" }, { status: 429 });
  }

  const supabase = createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) {
    return NextResponse.json({ error: "ကျေးဇူးပြု၍ ပြန်လည် Login ဝင်ပါ။" }, { status: 401 });
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const orderId = String(form.get("orderId") ?? "").slice(0, 64);
  if (!orderId) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  const slip = await validateSlip(form.get("slip"));
  if ("error" in slip) return NextResponse.json({ error: slip.error }, { status: 400 });

  const { error: uploadError } = await supabase.storage
    .from("payment-slips")
    .upload(slip.path, slip.body, { contentType: slip.mime, upsert: false });
  if (uploadError) {
    console.error("Slip upload failed", uploadError);
    return NextResponse.json({ error: "ပြေစာ တင်၍ မရပါ။ ခဏနေ ပြန်ကြိုးစားပါ။" }, { status: 500 });
  }

  const { data, error } = await supabase.rpc("submit_payment_slip", {
    p_order_id: orderId,
    p_slip_path: slip.path,
  });
  if (error || !data) {
    console.error("submit_payment_slip failed", error);
    return NextResponse.json({ error: friendlyDbError(error?.message) }, { status: 400 });
  }

  const order = data as { id: string; customer_name: string; customer_email: string; total_amount: number };
  await notifyTelegram(
    [
      "📄 <b>Payment slip received</b>",
      "",
      `🧾 <b>Order:</b> #${escapeHtml(order.id.slice(0, 8))}`,
      `👤 ${escapeHtml(order.customer_name)} (${escapeHtml(order.customer_email)})`,
      `💰 <b>Total:</b> $${Number(order.total_amount).toFixed(2)}`,
      "📎 <i>Check the slip in the admin panel.</i>",
    ].join("\n"),
  );

  return NextResponse.json({ ok: true });
}
