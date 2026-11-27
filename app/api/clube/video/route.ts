import { route, loadCtx, bad } from "@/lib/api";
import { getStore } from "@/lib/store";
import { analyzeVideo } from "@/lib/videoReview";

export const maxDuration = 300;
export const POST = route(async (user, req) => {
  const { videoId } = await req.json();
  const v = await getStore().get("videos", String(videoId ?? ""));
  if (!v || v.userId !== user.id) bad("Vídeo não encontrado.", 404);
  return analyzeVideo(await loadCtx(user.id), v!);
});
