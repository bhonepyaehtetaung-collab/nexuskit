// Netlify Background Function (name ends in "-background": runs up to 15 minutes).
// Called only by our own API routes, with the shared secret header.
import { isJobRequest, runJob } from "../../lib/server/jobs";
import { createServiceClient } from "../../lib/server/supabase-admin";

export default async (request: Request) => {
  if (!isJobRequest(request)) return new Response("Forbidden", { status: 403 });
  const body = await request.json().catch(() => ({}));
  const id = typeof body?.id === "string" && /^[0-9a-f-]{36}$/.test(body.id) ? body.id : null;
  const db = createServiceClient();
  if (!id || !db) return new Response("Bad request", { status: 400 });
  await runJob(db, id);
  return new Response("ok");
};
