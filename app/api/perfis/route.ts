import { route, bad } from "@/lib/api";
import { addProfile, suggestProfiles } from "@/lib/discovery";

export const maxDuration = 180;
export const POST = route(async (user, req) => {
  const b = await req.json();
  if (b.action === "sugerir") return suggestProfiles(user.id);
  if (b.action === "adicionar") return addProfile(user.id, b.username);
  bad("Ação desconhecida.");
});
