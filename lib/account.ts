import fs from "node:fs";
import { getStore } from "./store";
import { verifyPassword } from "./password";
import { uploadDir } from "./videos";
import { WRITABLE, READONLY } from "./collections";

/** Apaga a conta e tudo o que é dela. Irreversível, por isso pede a senha. */
export async function deleteAccount(userId: string, password: string) {
  const store = getStore();
  const user = await store.get("users", userId);
  if (!user || !verifyPassword(password, String(user.password))) throw new Error("Senha incorreta. Nada foi apagado.");
  for (const c of [...WRITABLE, ...READONLY, "ledger", "sessions", "ig_pending", "video_chunks", "invites", "meta_app", "ai_settings"]) await store.removeAllForUser(c, userId);
  fs.rmSync(uploadDir(userId), { recursive: true, force: true });
  await store.removeAllForUser("users", userId);
}
