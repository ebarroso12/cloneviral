import { route } from "@/lib/api";
import { syncAccount } from "@/lib/instagram";
export const maxDuration = 300;
export const POST = route(async (user) => syncAccount(user.id));
