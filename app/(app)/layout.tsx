import { isOwner } from "@/lib/invites";
import { requireUser } from "@/lib/auth";
import { balance, ensureCycle, PLANS } from "@/lib/credits";
import Shell from "@/components/Shell";
import { getStore } from "@/lib/store";

export const dynamic = "force-dynamic";
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  await ensureCycle(user.id);
  const credits = await balance(user.id);
  const plan = PLANS[user.plan] ?? PLANS.trial;
  const [conn] = await getStore().list("ig_connection", user.id);
  return <Shell owner={await isOwner(user.id)} handle={conn?.igUsername} user={{ name: user.name, email: user.email }} credits={credits} planName={plan.name} total={plan.monthlyCredits}>{children}</Shell>;
}
