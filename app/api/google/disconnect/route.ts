import { route } from "@/lib/api";
import { disconnectGoogle } from "@/lib/google";

export const POST = route(async (user) => {
  await disconnectGoogle(user.id);
  return { ok: true };
});
