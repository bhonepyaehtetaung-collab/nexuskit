import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { clientIp, friendlyDbError, isSameOrigin, rateLimit, validateSlip } from "@/lib/server/guard";
import { escapeHtml, notifyTelegram } from "@/lib/server/telegram";

type OrderPayload = {
  email?: unknown;
  name?: unknown;
  phone?: unknown;
  info?: unknown;
  items?: unknown;
  paymentMethod?: unknown;
  promoCode?: unknown;
};

const str = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");

function badRequest(error: string, status = 400) {
  return NextResponse.json({ error }, { status });
}

/**
 * POST /api/orders — create an order.
 * Body: multipart/form-data with `payload` (JSON) and optional `slip` (image).
 * Prices are calculated in the database by create_order(); anything the
 * browser says about prices is ignored.
 */
export async function POST(request: Request) {
  if (!isSameOrigin(request)) return badRequest("Forbidden", 403);
  if (!rateLimit(`order:${clientIp(request)}`, 5, 10 * 60 * 1000)) {
    return badRequest("အော်ဒါ အကြိမ်များလွန်းနေပါသည်။ ခဏနေမှ ပြန်ကြိုးစားပါ။", 429);
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return badRequest("Invalid request");
  }

  let payload: OrderPayload;
  try {
    payload = JSON.parse(String(form.get("payload") ?? "{}"));
  } catch {
    return badRequest("Invalid request");
  }

  const email = str(payload.email, 254).toLowerCase();
  const name = str(payload.name, 100);
  const phone = str(payload.phone, 40);
  const paymentMethod = str(payload.paymentMethod, 64);
  const promoCode = str(payload.promoCode, 40);

  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return badRequest("Email လိပ်စာ မှန်ကန်မှု မရှိပါ။");
  if (!paymentMethod) return badRequest("ငွေပေးချေမှုနည်းလမ်း ရွေးပေးပါ။");

  // Only send id + quantity to the database — never price.
  const rawItems = Array.isArray(payload.items) ? payload.items.slice(0, 50) : [];
  const items = rawItems
    .map((item) => {
      const it = item as { id?: unknown; bundleId?: unknown; quantity?: unknown };
      const quantity = Math.floor(Number(it.quantity));
      if (it.bundleId) return { bundle_id: String(it.bundleId).slice(0, 64), quantity };
      return { id: String(it.id ?? "").slice(0, 64), quantity };
    })
    .filter((it) => ("bundle_id" in it ? it.bundle_id : it.id) && Number.isInteger(it.quantity) && it.quantity >= 1 && it.quantity <= 99);
  if (items.length === 0) return badRequest("Cart ထဲတွင် ပစ္စည်း မရှိပါ။");

  const info: Record<string, string> = {};
  if (payload.info && typeof payload.info === "object" && !Array.isArray(payload.info)) {
    for (const [key, value] of Object.entries(payload.info as Record<string, unknown>).slice(0, 20)) {
      const k = key.trim().slice(0, 100);
      const v = str(value, 500);
      if (k && v) info[k] = v;
    }
  }

  const supabase = createClient();
  const isPayLater = paymentMethod === "pay-later";

  // Upload the slip to the PRIVATE bucket first.
  let slipPath: string | null = null;
  if (!isPayLater) {
    const slip = await validateSlip(form.get("slip"));
    if ("error" in slip) return badRequest(slip.error);
    const { error: uploadError } = await supabase.storage
      .from("payment-slips")
      .upload(slip.path, slip.body, { contentType: slip.mime, upsert: false });
    if (uploadError) {
      console.error("Slip upload failed", uploadError);
      return badRequest("ပြေစာ တင်၍ မရပါ။ ခဏနေ ပြန်ကြိုးစားပါ။", 500);
    }
    slipPath = slip.path;
  }

  const { data, error } = await supabase.rpc("create_order", {
    p_email: email,
    p_name: name || null,
    p_phone: phone || null,
    p_info: info,
    p_items: items,
    p_payment_method: paymentMethod,
    p_promo_code: promoCode || null,
    p_slip_path: slipPath,
  });

  if (error || !data) {
    console.error("create_order failed", error);
    return badRequest(friendlyDbError(error?.message));
  }

  const order = data as {
    id: string;
    total: number;
    subtotal: number;
    discount_percent: number;
    payment_method: string;
    note: string;
    items: { name: string; quantity: number }[];
  };

  const lines = [
    isPayLater ? "🤝 <b>[PAY AFTER SETUP] New order</b>" : "🚨 <b>New paid order</b>",
    "",
    `🧾 <b>Order:</b> #${escapeHtml(order.id.slice(0, 8))}`,
    `📧 <b>Email:</b> ${escapeHtml(email)}`,
    order.note ? `📝 ${escapeHtml(order.note)}` : "",
    "",
    ...order.items.map((i) => `• ${escapeHtml(i.name)} × ${i.quantity}`),
    "",
    `💰 <b>Total:</b> $${Number(order.total).toFixed(2)}${order.discount_percent > 0 ? ` (−${order.discount_percent}%)` : ""}`,
    `💳 <b>Method:</b> ${escapeHtml(isPayLater ? "Pay after setup" : order.payment_method)}`,
    isPayLater ? "⚠️ <i>Set up first, then collect payment.</i>" : "📎 <i>Slip is in the admin panel.</i>",
  ].filter((line, i, arr) => !(line === "" && arr[i - 1] === ""));
  await notifyTelegram(lines.join("\n"));

  return NextResponse.json({ id: order.id, total: order.total });
}
