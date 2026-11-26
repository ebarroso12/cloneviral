import { route } from "@/lib/api";
import { saveMetaApp } from "@/lib/metaApp";

export const POST = route(async (user, req) => {
  await saveMetaApp(user.id, await req.json());
  return { ok: true };
});
