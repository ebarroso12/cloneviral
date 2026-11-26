import { route, bad } from "@/lib/api";
import { createInvite, isOwner } from "@/lib/invites";
import { getStore } from "@/lib/store";

export const POST = route(async (user, req) => {
  const { code, expiresAt } = await createInvite(user.id);
  const origin = process.env.APP_URL || new URL(req.url).origin;
  return { code, expiresAt, link: `${origin}/signup?convite=${code}` };
});

/** Cancela todos os convites ainda não usados. */
export const DELETE = route(async (user) => {
  if (!(await isOwner(user.id))) bad("Só o dono pode cancelar convites.", 403);
  await getStore().removeAllForUser("invites", user.id);
  return { ok: true };
});
