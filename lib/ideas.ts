import { getStore } from "./store";
import { withCharge, COSTS } from "./credits";
import { genScripts } from "./ai";
import { loadCtx } from "./api";
import { HttpError } from "./auth";
import { saveScripts } from "./scripts";

/** Transforma um cartão do quadro de ideias em roteiro e move o cartão para "Roteirizando". */
export async function ideaToScript(userId: string, ideaId: string) {
  const store = getStore();
  const idea = (await store.get("ideas", ideaId)) as any;
  if (!idea || idea.userId !== userId) throw new HttpError(404, "Ideia não encontrada.");
  const ctx = await loadCtx(userId);
  return withCharge(userId, COSTS.roteiro, "Roteiro de uma ideia", async () => {
    const list = await genScripts(ctx, { type: "viral", dest: "reel", theme: String(idea.text).slice(0, 300), n: 1 });
    const [script] = await saveScripts(userId, list);
    await store.update("ideas", ideaId, userId, { status: "roteirizando", scriptId: script.id });
    return script;
  });
}
