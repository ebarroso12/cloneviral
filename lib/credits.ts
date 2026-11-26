import { getStore } from "./store";

// Custos por criação (créditos). Medidos na tela "Meu plano" do original.
export const COSTS = {
  roteiro: 1,
  analisePerfil: 2,
  carrossel: 2,
  isca: 3,
  persona: 8,
  sugestaoPerfis: 12,
  noticias: 1,
  serie: (chapters: number) => 2 + chapters, // 7 capítulos = 9
  varredura: (scripts: number) => 2 + Math.ceil(scripts * 1.2), // 5 = 8, 10 = 14
} as const;

export const COST_TABLE: { label: string; credits: number | string }[] = [
  { label: "Roteiro", credits: 1 },
  { label: "Análise de um perfil", credits: 2 },
  { label: "Carrossel", credits: 2 },
  { label: "Isca de alto valor", credits: 3 },
  { label: "Persona", credits: 8 },
  { label: "Série de 7 capítulos", credits: 9 },
  { label: "Varredura de 10 roteiros", credits: 14 },
];

export const PLANS = {
  trial: { name: "Trial 30 dias", monthlyCredits: 30, priceCents: 0 },
  start: { name: "START", monthlyCredits: 100, priceCents: 9700 },
} as const;

export type LedgerEntry = { id: string; userId: string; at: string; kind: "grant" | "charge" | "refund"; amount: number; label: string; note?: string; refId?: string; createdAt: string };

export async function ledger(userId: string): Promise<LedgerEntry[]> {
  const rows = (await getStore().list("ledger", userId)) as unknown as LedgerEntry[];
  return rows.sort((a, b) => b.at.localeCompare(a.at));
}

export async function balance(userId: string) {
  const rows = await ledger(userId);
  return rows.reduce((s, r) => s + r.amount, 0);
}

export class InsufficientCredits extends Error {
  status = 402;
  constructor(public needed: number, public available: number) {
    super(`Créditos insuficientes: precisa de ${needed} e você tem ${available}.`);
  }
}

/** Debita antes de gerar. Lança InsufficientCredits se faltar saldo. */
export function charge(userId: string, amount: number, label: string, refId?: string) {
  return exclusive(userId, async () => {
    const bal = await balance(userId);
    if (bal < amount) throw new InsufficientCredits(amount, bal);
    return getStore().insert("ledger", userId, { at: new Date().toISOString(), kind: "charge", amount: -amount, label, refId });
  });
}

// Uma cobrança por vez para cada usuário. Vale dentro de um processo do servidor; com várias
// instâncias contra o Supabase a garantia teria de ser uma função no banco.
const queues = new Map<string, Promise<unknown>>();
function exclusive<T>(key: string, fn: () => Promise<T>): Promise<T> {
  const run = (queues.get(key) ?? Promise.resolve()).then(fn, fn);
  queues.set(key, run.catch(() => {}));
  return run;
}

/** Cobra, executa e devolve o crédito se a criação falhar. */
export async function withCharge<T>(userId: string, amount: number, label: string, fn: () => Promise<T>, refId?: string): Promise<T> {
  await charge(userId, amount, label, refId);
  try {
    return await fn();
  } catch (e) {
    await refund(userId, amount, label, "A criação falhou e o crédito voltou para você.", refId);
    throw e;
  }
}

/** Devolve a diferença quando o resultado rende menos que o previsto. */
export async function refund(userId: string, amount: number, label: string, note: string, refId?: string) {
  if (amount <= 0) return null;
  return getStore().insert("ledger", userId, { at: new Date().toISOString(), kind: "refund", amount, label, note, refId });
}

export async function grant(userId: string, amount: number, label: string) {
  return getStore().insert("ledger", userId, { at: new Date().toISOString(), kind: "grant", amount, label });
}

export async function summary(userId: string) {
  const rows = await ledger(userId);
  const charged = rows.filter((r) => r.kind === "charge").reduce((s, r) => s - r.amount, 0);
  const refunded = rows.filter((r) => r.kind === "refund").reduce((s, r) => s + r.amount, 0);
  const granted = rows.filter((r) => r.kind === "grant").reduce((s, r) => s + r.amount, 0);
  return { granted, charged, refunded, used: charged - refunded, available: granted - charged + refunded, rows };
}
