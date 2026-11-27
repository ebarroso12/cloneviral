import { route, loadCtx, bad } from "@/lib/api";
import { saveScripts } from "@/lib/scripts";
import { applyVoice } from "@/lib/ai";
import { READY } from "@/lib/readyScripts";

export const POST = route(async (user, req) => {
  const { n } = await req.json();
  const r = READY.find((x) => x.n === Number(n));
  if (!r) bad("Roteiro não encontrado.", 404);
  const b = (await loadCtx(user.id)).business;
  const [saved] = await saveScripts(user.id, [{ generator: "modelo", type: r!.type, dest: "reel", seconds: r!.seconds, title: r!.title, hook: applyVoice(r!.hook, b), body: applyVoice(r!.body, b), cta: applyVoice(b.voice?.cta || "Acesse o link da bio.", b) }]);
  return saved;
});
