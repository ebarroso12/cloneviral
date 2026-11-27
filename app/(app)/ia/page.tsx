import { requireUser } from "@/lib/auth";
import { aiStatus, PROVIDERS } from "@/lib/providers";
import View from "./view";
export const dynamic = "force-dynamic";
export default async function Page() {
  const u = await requireUser();
  const s = await aiStatus(u.id);
  return <View owner={s.owner} kinds={s.kinds} providers={PROVIDERS} />;
}
