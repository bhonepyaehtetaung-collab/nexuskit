import { cache } from "react";
import { cookies } from "next/headers";
import { createPublicClient } from "@/lib/server/public-db";
import { LANG_COOKIE, type Lang } from "./lang";
import { translate, type TextOverrides, type TKey } from "./dict";

/** The visitor's language on the server (Burmese unless they chose English). */
export async function getLang(): Promise<Lang> {
  return (await cookies()).get(LANG_COOKIE)?.value === "en" ? "en" : "my";
}

/** Store text the admin customised (site_settings.ui_text). Loaded once per request. */
export const getTextOverrides = cache(async (): Promise<TextOverrides> => {
  try {
    const { data, error } = await createPublicClient().from("site_settings").select("ui_text").eq("id", 1).maybeSingle();
    if (error || !data?.ui_text || typeof data.ui_text !== "object") return {};
    return data.ui_text as TextOverrides;
  } catch {
    return {};
  }
});

/** Server-side t(): dictionary + admin overrides. */
export async function getT() {
  const [lang, overrides] = await Promise.all([getLang(), getTextOverrides()]);
  return { lang, t: (key: TKey, vars?: Record<string, string | number>) => translate(lang, key, vars, overrides) };
}
