import { route, bad } from "@/lib/api";
import { ideaToScript } from "@/lib/ideas";

export const POST = route(async (user, req) => {
  const { ideaId } = await req.json();
  if (!ideaId) bad("Informe a ideia.");
  return ideaToScript(user.id, String(ideaId));
});
