// Server-side only: imported from route handlers, never from client components.
import { randomUUID } from "crypto";

/* ------------------------------------------------------------------ */
/* Rate limiting                                                       */
/* ------------------------------------------------------------------ */

const hits = new Map<string, number[]>();

/**
 * Simple in-memory sliding-window limiter. It protects a single server
 * instance from bursts (spam orders, upload floods). On multi-instance
 * hosting, put a shared limiter (e.g. Upstash, Vercel Firewall) in front.
 */
export function rateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const recent = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
  if (recent.length >= limit) {
    hits.set(key, recent);
    return false;
  }
  recent.push(now);
  hits.set(key, recent);
  if (hits.size > 5000) {
    for (const [k, times] of hits) {
      if (times.every((t) => now - t >= windowMs)) hits.delete(k);
    }
  }
  return true;
}

export function clientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return request.headers.get("x-real-ip") ?? "unknown";
}

/** Reject cross-site form posts (basic CSRF protection for our JSON/form APIs). */
export function isSameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return true; // same-origin fetches from some browsers omit it
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

/* ------------------------------------------------------------------ */
/* Uploaded image validation                                           */
/* ------------------------------------------------------------------ */

export const MAX_SLIP_BYTES = 5 * 1024 * 1024;

type ImageKind = { ext: "png" | "jpg" | "webp"; mime: string };

/** Detect the real image type from the file's first bytes (not its name). */
function sniffImage(bytes: Uint8Array): ImageKind | null {
  if (bytes.length >= 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) {
    return { ext: "png", mime: "image/png" };
  }
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return { ext: "jpg", mime: "image/jpeg" };
  }
  if (
    bytes.length >= 12 &&
    bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 &&
    bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50
  ) {
    return { ext: "webp", mime: "image/webp" };
  }
  return null;
}

export type ValidSlip = { path: string; body: Uint8Array; mime: string };

/** Validate an uploaded payment slip and give it a random, safe file name. */
export async function validateSlip(file: unknown): Promise<ValidSlip | { error: string }> {
  if (!(file instanceof File) || file.size === 0) {
    return { error: "ငွေလွှဲပြေစာ (Screenshot) ကို တင်ပေးပါ။" };
  }
  if (file.size > MAX_SLIP_BYTES) {
    return { error: "ပုံဖိုင် 5MB ထက် မကျော်ရပါ။" };
  }
  const body = new Uint8Array(await file.arrayBuffer());
  const kind = sniffImage(body);
  if (!kind) {
    return { error: "PNG, JPG သို့မဟုတ် WEBP ပုံကိုသာ လက်ခံပါသည်။" };
  }
  return { path: `${randomUUID()}.${kind.ext}`, body, mime: kind.mime };
}

/* ------------------------------------------------------------------ */
/* Friendly messages for database errors                               */
/* ------------------------------------------------------------------ */

const DB_ERRORS: Record<string, string> = {
  INVALID_EMAIL: "Email လိပ်စာ မှန်ကန်မှု မရှိပါ။",
  INVALID_ITEMS: "Cart ထဲတွင် ပစ္စည်း မရှိပါ (သို့) များလွန်းနေပါသည်။",
  INVALID_QUANTITY: "အရေအတွက် မှန်ကန်မှု မရှိပါ။",
  INVALID_INPUT: "ဖြည့်ထားသော အချက်အလက် ရှည်လွန်းနေပါသည်။",
  PRODUCT_NOT_FOUND: "Cart ထဲက ပစ္စည်းတစ်ခု မရှိတော့ပါ။ Cart ကို ပြန်စစ်ပေးပါ။",
  INVALID_PROMO: "Promo code မှားနေပါသည်။",
  PAY_LATER_DISABLED: "ယခုအချိန်တွင် နောက်မှပေးချေမှု မရနိုင်ပါ။",
  INVALID_PAYMENT_METHOD: "ငွေပေးချေမှုနည်းလမ်း ရွေးပေးပါ။",
  SLIP_REQUIRED: "ငွေလွှဲပြေစာ (Screenshot) ကို တင်ပေးပါ။",
  SLIP_ALREADY_USED: "ဤပြေစာကို အသုံးပြုပြီးဖြစ်ပါသည်။",
  ORDER_NOT_FOUND: "ဤအော်ဒါအတွက် ပြေစာတင်၍ မရပါ။",
  NOT_AUTHENTICATED: "ကျေးဇူးပြု၍ ပြန်လည် Login ဝင်ပါ။",
};

export function friendlyDbError(message: string | undefined): string {
  for (const code of Object.keys(DB_ERRORS)) {
    if (message?.includes(code)) return DB_ERRORS[code];
  }
  return "တစ်ခုခု မှားယွင်းသွားပါသည်။ ခဏနေ ပြန်ကြိုးစားပေးပါ။";
}
