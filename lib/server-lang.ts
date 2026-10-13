import { cookies } from "next/headers";
import { LANG_COOKIE, type Lang } from "./lang";

/** The visitor's language on the server (Burmese unless they chose English). */
export async function getLang(): Promise<Lang> {
  return (await cookies()).get(LANG_COOKIE)?.value === "en" ? "en" : "my";
}
