// Anúncios Meta, somente leitura (ads_read): soma as impressões entregues no Instagram.
import { getStore, scopedId } from "./store";
import { decrypt, gj, GRAPH } from "./instagram";
import { HttpError } from "./auth";

/** Número simulado: só existe para a conta de demonstração. */
export function adsConnectionData(conn: { demo?: boolean } | undefined, organicViews: number) {
  if (!conn?.demo) throw new Error("A simulação de anúncios é só da demonstração.");
  return { status: "connected", views: Math.round(organicViews * 0.18), demo: true };
}

export function adViewsFor(conn: { demo?: boolean } | undefined, ads: { status?: string; views?: number; demo?: boolean } | undefined) {
  if (!ads || ads.status !== "connected") return null;
  if (ads.demo && !conn?.demo) return null;
  return ads.views ?? null;
}

async function pages(url: string, each: (row: any) => void | Promise<void>) {
  let next: string | null = url;
  for (let i = 0; next && i < 20; i++) {
    const j: any = await gj(next);
    for (const row of j.data ?? []) await each(row);
    next = j.paging?.next ?? null;
  }
  // total incompleto seria um número menor apresentado como certo
  if (next) throw new Error("Há contas ou linhas demais para somar de uma vez.");
}

/** Qualquer falha interrompe: não há total parcial. */
export async function readAdViews(token: string) {
  const ids: string[] = [];
  await pages(`${GRAPH}/me/adaccounts?fields=account_id&limit=100&access_token=${token}`, (a) => void ids.push(String(a.account_id)));
  let views = 0;
  for (const id of ids)
    await pages(`${GRAPH}/act_${id}/insights?fields=impressions&date_preset=maximum&breakdowns=publisher_platform&limit=100&access_token=${token}`, (row) => {
      if (row.publisher_platform === "instagram") views += Number(row.impressions) || 0;
    });
  return { views, accounts: ids.length };
}

async function save(userId: string, data: Record<string, any>) {
  const s = getStore();
  const [cur] = await s.list("ads_connection", userId);
  return cur ? s.update("ads_connection", cur.id, userId, data) : s.insert("ads_connection", userId, data, scopedId(userId, "ads"));
}

export async function connectAds(userId: string) {
  const s = getStore();
  const [conn] = await s.list("ig_connection", userId);
  if (conn?.demo) {
    const organic = (await s.list("posts", userId)).reduce((a, p: any) => a + p.views, 0);
    return save(userId, adsConnectionData(conn as { demo?: boolean }, organic));
  }
  if (!conn || conn.status !== "connected" || !conn.token) throw new HttpError(400, "Conecte primeiro a sua conta do Instagram.");
  const token = decrypt(conn.token);
  const perms = await gj(`${GRAPH}/me/permissions?access_token=${token}`);
  if (!(perms.data ?? []).some((p: any) => p.permission === "ads_read" && p.status === "granted")) throw new HttpError(409, "Falta a permissão ads_read. Use o botão Autorizar leitura de anúncios.");
  return save(userId, { status: "connected", demo: false, ...(await readAdViews(token)), updatedFrom: "meta" });
}

export const disconnectAds = (userId: string) => save(userId, { status: "disconnected", views: 0 });

/** Chamado pela coleta: só atualiza quem já conectou. */
export async function refreshAds(userId: string, token: string) {
  const [cur] = await getStore().list("ads_connection", userId);
  if (!cur || cur.demo || cur.status !== "connected") return;
  await save(userId, await readAdViews(token));
}
