import { route, bad } from "@/lib/api";
import { aiStatus, saveAi, getAi, askText, askImage, KINDS, type Kind } from "@/lib/providers";
import { isOwner } from "@/lib/invites";

export const maxDuration = 180;
export const GET = route(async (user) => aiStatus(user.id));
export const POST = route(async (user, req) => {
  const b = await req.json();
  if (b.action === "testar") {
    if (!(await isOwner(user.id))) bad("Só o dono pode testar a IA.", 403);
    const kind = String(b.kind) as Kind;
    if (!KINDS.includes(kind)) bad("Tipo de IA desconhecido.");
    const cfg = await getAi(kind, user.id);
    if (!cfg) bad("Nada ligado aqui. Salve um provedor com a chave primeiro.");
    try {
      if (kind === "image") return { ok: true, image: await askImage(cfg!, "um farol ao amanhecer, ilustração simples") };
      return { ok: true, text: (await askText(cfg!, "Responda em português com uma frase curta.", "Diga que a conexão funcionou.", 45000)).slice(0, 200) };
    } catch (e: any) {
      bad(String(e?.message ?? "A IA não respondeu.").slice(0, 250), 502);
    }
  }
  await saveAi(user.id, b);
  return aiStatus(user.id);
});
