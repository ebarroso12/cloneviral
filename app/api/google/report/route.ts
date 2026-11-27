import { route } from "@/lib/api";
import { googleReport } from "@/lib/googleData";

export const GET = route(async (user, req) => googleReport(user.id, Number(new URL(req.url).searchParams.get("dias") ?? 28) as 7 | 28 | 90));
