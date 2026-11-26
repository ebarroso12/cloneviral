import { getStore } from "./store";
import type { ScriptOut } from "./ai";

/** Grava roteiros novos ou, com replaceId, reescreve o roteiro existente (Regenerar). */
export async function saveScripts(userId: string, list: ScriptOut[], replaceId?: string) {
  const store = getStore();
  if (replaceId) {
    const { title, hook, body, cta, generator } = list[0];
    const doc = await store.update("scripts", replaceId, userId, { title, hook, body, cta, generator });
    if (!doc) throw new Error("Roteiro não encontrado.");
    return [doc];
  }
  const saved = [];
  for (const s of list) saved.push(await store.insert("scripts", userId, { ...s, source: "manual", recorded: false }));
  return saved;
}
