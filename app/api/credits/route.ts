import { route } from "@/lib/api";
import { summary, grant, COST_TABLE, PLANS } from "@/lib/credits";
export const GET = route(async (user) => {
  const s = await summary(user.id);
  return { ...s, plan: user.plan, planName: PLANS[user.plan].name, trialEndsAt: user.trialEndsAt, monthlyCredits: PLANS.start.monthlyCredits, priceCents: PLANS.start.priceCents, costs: COST_TABLE };
});

// Sem gateway de pagamento configurado, "mais créditos" concede um pacote de demonstração (sem cobrança).
export const POST = route(async (user) => {
  await grant(user.id, 20, "Pacote de demonstração (sem cobrança)");
  return summary(user.id);
});
