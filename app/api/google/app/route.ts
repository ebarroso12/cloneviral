import { route } from "@/lib/api";
import { saveGoogleApp } from "@/lib/google";

export const POST = route(async (user, req) => {
  await saveGoogleApp(user.id, await req.json());
  return { ok: true };
});
