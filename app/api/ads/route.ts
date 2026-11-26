import { route, bad } from "@/lib/api";
import { connectAds, disconnectAds } from "@/lib/ads";
import { HttpError } from "@/lib/auth";

export const maxDuration = 60;

// Anúncios Meta, somente leitura.
export const POST = route(async (user, req) => {
  const { action } = await req.json();
  if (action !== "connect") return disconnectAds(user.id);
  try {
    return await connectAds(user.id);
  } catch (e: any) {
    if (e instanceof HttpError) throw e;
    bad(`A Meta não devolveu os anúncios: ${String(e.message).slice(0, 200)}`, 502);
  }
});
