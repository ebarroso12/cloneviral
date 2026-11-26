import { route } from "@/lib/api";
import { schedulePost } from "@/lib/schedule";

export const POST = route(async (user, req) => schedulePost(user.id, await req.json()));
