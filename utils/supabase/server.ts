
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export function createClient() {
  const cookieStore = cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get: async (name: string) => {
          const cookie = (await cookieStore).get(name);
          return cookie?.value;
        },
        set: async (name: string, value: string, options: any) => {
          try {
            (await cookieStore).set({ name, value, ...options });
          } catch (error) {
            // The `cookies()` helper can be called only when a Next.js render is
            // happening, and only from a Server Component or Route Handler.
            // For more info: https://nextjs.org/docs/app/api-reference/functions/cookies#cookiessetname-value-options
          }
        },
        remove: async (name: string, options: any) => {
          try {
            (await cookieStore).set({ name, value: "", ...options });
          } catch (error) {
            // The `cookies()` helper can be called only when a Next.js render is
            // happening, and only from a Server Component or Route Handler.
            // For more info: https://nextjs.org/docs/app/api-reference/functions/cookies#cookiessetname-value-options
          }
        },
      },
    },
  );
}
