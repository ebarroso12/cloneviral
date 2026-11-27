import { requireUser } from "@/lib/auth";
import { READY } from "@/lib/readyScripts";
import View from "./view";
export const dynamic = "force-dynamic";
export default async function Page() {
  await requireUser();
  return <View rows={READY} />;
}
