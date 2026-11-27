import { route, loadCtx, bad } from "@/lib/api";
import { getStore } from "@/lib/store";
import { genStories } from "@/lib/stories";

export const maxDuration = 120;
// Assistente de Stories: cria uma sequência ou ajusta uma que já existe.
export const POST = route(async (user, req) => {
  const b = await req.json();
  const store = getStore();
  const ctx = await loadCtx(user.id);
  if (b.id) {
    const cur = await store.get("stories", String(b.id));
    if (!cur || cur.userId !== user.id) bad("Sequência não encontrada.", 404);
    const instruction = String(b.instruction ?? "").trim().slice(0, 400);
    if (!instruction) bad("Diga o que ajustar.");
    const next = await genStories(ctx, { goal: cur!.goal, format: cur!.format, count: cur!.frames.length, previous: cur!.frames, instruction });
    return store.update("stories", cur!.id, user.id, next);
  }
  const goal = String(b.goal ?? "").trim().slice(0, 200);
  if (!goal) bad("Diga o objetivo da sequência.");
  return store.insert("stories", user.id, await genStories(ctx, { goal, format: b.format, count: b.count }));
});
