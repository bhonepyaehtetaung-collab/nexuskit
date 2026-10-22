// Netlify Scheduled Function: every morning at 07:15 Myanmar time (00:45 UTC)
// it asks the AI for 5 Hub news + 5 real job openings. Each draft goes to the
// owner's Telegram with ✅ / ❌ — nothing is published without approval.
// Scheduled functions only run on the published (production) deploy.
import { startDaily } from "../../lib/server/daily";
import { createServiceClient } from "../../lib/server/supabase-admin";

export default async () => {
  const db = createServiceClient();
  const origin = process.env.URL || process.env.DEPLOY_PRIME_URL || "";
  if (!db || !origin) {
    console.log("ai-daily: missing SUPABASE_SERVICE_ROLE_KEY or site URL");
    return new Response("not configured", { status: 200 });
  }
  try {
    const result = await startDaily(db, origin);
    console.log(`ai-daily: ${result}`);
    return new Response(result);
  } catch (error) {
    console.error("ai-daily failed", error);
    return new Response("error", { status: 500 });
  }
};

export const config = { schedule: "45 0 * * *" };
