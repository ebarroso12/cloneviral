import { requireUser } from "@/lib/auth";
import { summary, COST_TABLE, PLANS } from "@/lib/credits";
import PlanoView from "./view";
export const dynamic = "force-dynamic";
export default async function Page() {
  const u = await requireUser();
  const s = await summary(u.id);
  return <PlanoView s={JSON.parse(JSON.stringify(s))} plan={u.plan} trialEndsAt={u.trialEndsAt} costs={COST_TABLE} start={PLANS.start} />;
}
