import { route } from "@/lib/api";
import { HttpError } from "@/lib/auth";
import { googleReport } from "@/lib/googleData";

export const GET = route(async (user, req) => {
  try {
    return await googleReport(user.id, Number(new URL(req.url).searchParams.get("dias") ?? 28) as 7 | 28 | 90);
  } catch (e) {
    // "falta conectar ou escolher" é um estado da tela, não um erro
    if (e instanceof HttpError && e.status === 409) return { aviso: e.message };
    throw e;
  }
});
