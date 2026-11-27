import { route } from "@/lib/api";
import { saveGoogleSettings } from "@/lib/googleData";

export const POST = route(async (user, req) => {
  await saveGoogleSettings(user.id, await req.json());
  return { ok: true };
});
