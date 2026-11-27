// Números da busca pelo nome (Search Console) e do site (Analytics). Consulta na hora; nada é guardado.
import { getStore } from "./store";
import { accessToken, googleStatus, ownerOnly } from "./google";
import { HttpError } from "./auth";

const SEARCH_API = "https://www.googleapis.com/webmasters/v3/sites";
const ADMIN_API = "https://analyticsadmin.googleapis.com/v1beta/accountSummaries";
const DATA_API = "https://analyticsdata.googleapis.com/v1beta/properties";
const LAG_DAYS = 3; // a busca do Google fecha os números com alguns dias de atraso

async function call(token: string, url: string, body?: unknown): Promise<any> {
  const r = await fetch(url, {
    method: body ? "POST" : "GET",
    headers: { authorization: `Bearer ${token}`, ...(body ? { "content-type": "application/json" } : {}) },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(20000),
  });
  const j: any = await r.json().catch(() => null);
  // resposta ilegível não pode virar "zero medido"
  if (!r.ok || !j) throw new HttpError(502, String(j?.error?.message || `O Google respondeu ${r.status}.`).slice(0, 200));
  return j;
}

async function listSites(token: string): Promise<string[]> {
  const j = await call(token, SEARCH_API);
  return (j.siteEntry ?? []).filter((s: any) => s.permissionLevel !== "siteUnverifiedUser").map((s: any) => String(s.siteUrl));
}

async function listProperties(token: string) {
  const out: { id: string; name: string }[] = [];
  let page = "";
  for (let i = 0; i < 10; i++) {
    const j = await call(token, `${ADMIN_API}?pageSize=200${page ? `&pageToken=${encodeURIComponent(page)}` : ""}`);
    for (const a of j.accountSummaries ?? []) for (const p of a.propertySummaries ?? []) out.push({ id: String(p.property).replace("properties/", ""), name: String(p.displayName ?? p.property) });
    page = j.nextPageToken ?? "";
    if (!page) break;
  }
  return out;
}

export async function googleOptions(userId: string) {
  await ownerOnly(userId);
  const token = await accessToken(userId);
  const [sites, properties] = await Promise.all([listSites(token), listProperties(token)]);
  return { sites, properties };
}

export async function saveGoogleSettings(userId: string, b: { siteUrl?: unknown; propertyId?: unknown; term?: unknown }) {
  await ownerOnly(userId);
  const store = getStore();
  const [conn] = await store.list("google_connection", userId);
  if (!conn) throw new HttpError(409, "Conecte o Google na tela Conexões.");
  const data: Record<string, string> = {};
  if (b.term !== undefined) {
    const term = String(b.term).trim().replace(/\s+/g, " ").toLowerCase();
    if (!term || term.length > 60) throw new HttpError(400, "Escreva o nome pesquisado, com até 60 letras.");
    data.term = term;
  }
  if (b.siteUrl !== undefined || b.propertyId !== undefined) {
    const { sites, properties } = await googleOptions(userId);
    if (b.siteUrl !== undefined) {
      const siteUrl = String(b.siteUrl);
      if (!sites.includes(siteUrl)) throw new HttpError(400, "Esse site não está verificado nesta conta do Google.");
      data.siteUrl = siteUrl;
    }
    if (b.propertyId !== undefined) {
      const p = properties.find((x) => x.id === String(b.propertyId));
      if (!p) throw new HttpError(400, "Essa propriedade não está nesta conta do Google.");
      data.propertyId = p.id;
      data.propertyName = p.name;
    }
  }
  await store.update("google_connection", conn.id, userId, data);
}

const iso = (t: number) => new Date(t).toISOString().slice(0, 10);

export function reportRange(days: 7 | 28 | 90, now = new Date()) {
  const end = now.getTime() - LAG_DAYS * 86400000;
  return { start: iso(end - (days - 1) * 86400000), end: iso(end) };
}

export type Part<T> = ({ ok: true } & T) | { ok: false; error: string };
type SearchData = { impressions: number; clicks: number; ctr: number | null; position: number | null; queries: { query: string; impressions: number; clicks: number }[] };
type SiteData = { visits: number; whatsapp: number };

async function part<T>(fn: () => Promise<T>): Promise<Part<T>> {
  try {
    return { ok: true, ...(await fn()) };
  } catch (e: any) {
    return { ok: false, error: e instanceof HttpError ? e.message : "O Google não respondeu. Tente de novo." };
  }
}

async function searchNumbers(token: string, siteUrl: string, term: string, range: { start: string; end: string }): Promise<SearchData> {
  const url = `${SEARCH_API}/${encodeURIComponent(siteUrl)}/searchAnalytics/query`;
  const body = { startDate: range.start, endDate: range.end, dimensionFilterGroups: [{ filters: [{ dimension: "query", operator: "contains", expression: term }] }] };
  const [total, list] = await Promise.all([call(token, url, body), call(token, url, { ...body, dimensions: ["query"], rowLimit: 25 })]);
  const t = total.rows?.[0];
  return {
    impressions: t?.impressions ?? 0,
    clicks: t?.clicks ?? 0,
    ctr: t?.ctr ?? null,
    position: t?.position ?? null,
    queries: (list.rows ?? []).map((r: any) => ({ query: String(r.keys?.[0] ?? ""), impressions: r.impressions ?? 0, clicks: r.clicks ?? 0 })),
  };
}

async function siteNumbers(token: string, propertyId: string, range: { start: string; end: string }): Promise<SiteData> {
  const is = (fieldName: string, value: string) => ({ filter: { fieldName, stringFilter: { value } } });
  const organic = [is("sessionSource", "google"), is("sessionMedium", "organic")];
  const run = async (metric: string, filters: unknown[]) => {
    const j = await call(token, `${DATA_API}/${propertyId}:runReport`, { dateRanges: [{ startDate: range.start, endDate: range.end }], metrics: [{ name: metric }], dimensionFilter: { andGroup: { expressions: filters } } });
    return Number(j.rows?.[0]?.metricValues?.[0]?.value ?? 0);
  };
  const [visits, whatsapp] = await Promise.all([run("sessions", organic), run("eventCount", [...organic, is("eventName", "generate_lead")])]);
  return { visits, whatsapp };
}

export async function googleReport(userId: string, days: 7 | 28 | 90) {
  await ownerOnly(userId);
  if (![7, 28, 90].includes(days)) throw new HttpError(400, "Escolha 7, 28 ou 90 dias.");
  const s = await googleStatus(userId);
  if (s.status === "connected" && (!s.siteUrl || !s.propertyId)) throw new HttpError(409, "Escolha o site e a propriedade do Analytics na tela Conexões.");
  const token = await accessToken(userId);
  const range = reportRange(days);
  const [search, site] = await Promise.all([
    part(() => searchNumbers(token, s.siteUrl, s.term, range)),
    part(() => siteNumbers(token, s.propertyId, range)),
  ]);
  return { ...range, term: s.term, search, site };
}
