import { requireUser } from "@/lib/auth";
import { getStore } from "@/lib/store";
import View from "./view";
import { getAi } from "@/lib/providers";
export const dynamic = "force-dynamic";
export default async function Page() {
  const u = await requireUser();
  const rows = (await getStore().list("analyses", u.id)).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return <View rows={JSON.parse(JSON.stringify(rows))} site={!!process.env.VERCEL} ai={!!(await getAi("video", u.id))} />;
}
