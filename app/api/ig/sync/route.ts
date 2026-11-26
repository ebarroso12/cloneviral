import { route } from "@/lib/api";
import { syncAccount } from "@/lib/instagram";
export const maxDuration = 60;
export const POST = route(async (user) => syncAccount(user.id));
