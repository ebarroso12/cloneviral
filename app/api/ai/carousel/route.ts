import { route, loadCtx, bad } from "@/lib/api";
import { getStore } from "@/lib/store";
import { withCharge, COSTS } from "@/lib/credits";
import { genCarousel } from "@/lib/ai";
import { modelById } from "@/lib/templates";

export const POST = route(async (user, req) => {
  const b = await req.json();
  const theme = String(b.theme ?? "").trim().slice(0, 300);
  if (!theme) bad("Escreva o tema do carrossel.");
  const model = b.modelId ? modelById(String(b.modelId)) : null;
  const store = getStore();
  const found = b.patternId ? ((await store.get("patterns", String(b.patternId))) as any) : null;
  const pattern = found?.userId === user.id ? found : null;
  const ctx = await loadCtx(user.id);
  return withCharge(user.id, COSTS.carrossel, "Carrossel", async () => {
    const slides = await genCarousel(ctx, { theme, model, pattern });
    const kit = (await store.list("brand_kit", user.id))[0];
    return store.insert("carousels", user.id, { theme, modelId: model?.id ?? null, slides, language: b.language ?? "pt-BR", brandApplied: !!kit?.applied, imageMode: b.imageMode ?? "color", coverImage: b.coverImage ?? null, approved: false });
  });
});
