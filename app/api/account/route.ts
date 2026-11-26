import { route, bad } from "@/lib/api";
import { deleteAccount } from "@/lib/account";
import { destroySession } from "@/lib/auth";

export const DELETE = route(async (user, req) => {
  const { password } = await req.json();
  await destroySessionAfter(user.id, String(password ?? ""));
  return { ok: true };
});

async function destroySessionAfter(userId: string, password: string) {
  try {
    await deleteAccount(userId, password);
  } catch (e: any) {
    bad(e.message, 403);
  }
  await destroySession();
}
