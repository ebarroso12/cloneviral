import { route, bad } from "@/lib/api";
import { getAi, askImage } from "@/lib/providers";

export const maxDuration = 180;
export const POST = route(async (user, req) => {
  const b = await req.json();
  const prompt = String(b.prompt ?? "").trim().slice(0, 600);
  if (!prompt) bad("Descreva a imagem que você quer.");
  const cfg = await getAi("image", user.id);
  if (!cfg) bad("Nenhuma IA de imagem ligada. Configure em IA e integrações.");
  try {
    return { image: await askImage(cfg!, `${prompt}. Composição vertical, sem nenhum texto escrito na imagem.`) };
  } catch (e: any) {
    bad(String(e?.message ?? "A IA de imagem não respondeu.").slice(0, 250), 502);
  }
});
