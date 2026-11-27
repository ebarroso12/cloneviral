import { route } from "@/lib/api";
import { googleOptions } from "@/lib/googleData";

export const GET = route(async (user) => googleOptions(user.id));
