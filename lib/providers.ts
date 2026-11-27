// Encaixe de IA: o dono escolhe o provedor de texto, vídeo e imagem na tela "IA e integrações".
// Regra do dono: nada que cobre sem ele marcar. Provedor pago exige autorização e só roda para o dono.
// Modelos e formatos conferidos nas páginas oficiais em 27/11/2026.
import { getStore, scopedId } from "./store";
import { encrypt, decrypt } from "./instagram";
import { isOwner } from "./invites";
import { HttpError } from "./auth";

export type Kind = "text" | "video" | "image";
type Api = "gemini" | "chat" | "anthropic" | "cloudflare" | "gemini-image" | "openai-image";
export type Provider = { id: string; kind: Kind; label: string; paid: boolean; api: Api; base?: string; models: string[]; keyUrl: string; note: string; needsAccount?: boolean };

const GEMINI_KEY = "https://aistudio.google.com/apikey";
const OPENAI_KEY = "https://platform.openai.com/api-keys";
export const PROVIDERS: Provider[] = [
  { id: "gemini-gratis", kind: "text", label: "Gemini, plano gratuito", paid: false, api: "gemini", models: ["gemini-3.6-flash", "gemini-3.8-flash", "gemini-3.5-flash-lite", "gemini-4-hydrogen"], keyUrl: GEMINI_KEY, note: "Recomendado para começar. Use uma chave de projeto sem faturamento. No gratuito, o Google pode usar o texto enviado para melhorar os produtos: não envie dados de pacientes ou clientes." },
  { id: "groq-gratis", kind: "text", label: "Groq, plano gratuito", paid: false, api: "chat", base: "https://api.groq.com/openai/v1", models: ["openai/gpt-oss-120b", "openai/gpt-oss-20b"], keyUrl: "https://console.groq.com/keys", note: "Reserva gratuita e rápida, com limite diário. Confira o limite no painel da Groq." },
  { id: "anthropic", kind: "text", label: "Claude (Anthropic), pago", paid: true, api: "anthropic", models: ["claude-sonnet-5-5", "claude-opus-5-5", "claude-haiku-5-5"], keyUrl: "https://platform.claude.com/settings/keys", note: "Sugestão paga para a melhor escrita: claude-opus-5-5. Equilíbrio entre preço e qualidade: claude-sonnet-5-5." },
  { id: "openai", kind: "text", label: "OpenAI, pago", paid: true, api: "chat", base: "https://api.openai.com/v1", models: ["gpt-6.2-sol", "gpt-6.2-astra", "gpt-6-luna"], keyUrl: OPENAI_KEY, note: "gpt-6.2-astra é o modelo principal; gpt-6.2-sol é o de uso diário; gpt-6-luna é o mais barato." },
  { id: "gemini-pago", kind: "text", label: "Gemini 4, pago", paid: true, api: "gemini", models: ["gemini-4-carbon", "gemini-4-argon"], keyUrl: GEMINI_KEY, note: "O preço do Gemini 4 Carbon dobra em 01/12/2026, segundo a página de preços do Google." },
  { id: "gemini-gratis", kind: "video", label: "Gemini, plano gratuito", paid: false, api: "gemini", models: ["gemini-3.5-flash-lite", "gemini-3.8-flash"], keyUrl: GEMINI_KEY, note: "Assiste ao vídeo e comenta. Pode ser a mesma chave do texto." },
  { id: "gemini-pago", kind: "video", label: "Gemini 4, pago", paid: true, api: "gemini", models: ["gemini-4-carbon"], keyUrl: GEMINI_KEY, note: "Análise mais detalhada, cobrada por uso." },
  { id: "cloudflare-gratis", kind: "image", label: "Cloudflare Workers AI (FLUX), gratuito", paid: false, api: "cloudflare", models: ["@cf/black-forest-labs/flux-1-schnell"], keyUrl: "https://dash.cloudflare.com/profile/api-tokens", note: "Recomendado sem custo: cota diária; no plano gratuito, passar da cota dá erro e não cobra. Precisa do ID da conta e de um token com acesso ao Workers AI.", needsAccount: true },
  { id: "gemini-imagem", kind: "image", label: "Nano Banana 2.1 (Google), pago", paid: true, api: "gemini-image", models: ["gemini-nano-banana-2.1", "gemini-3-pro-image"], keyUrl: GEMINI_KEY, note: "Imagens do Google não têm plano gratuito." },
  { id: "openai-imagem", kind: "image", label: "GPT Image (OpenAI), pago", paid: true, api: "openai-image", models: ["gpt-image-2.5-sunburst", "gpt-image-2.5-flare", "gpt-image-2.6-sunburst"], keyUrl: OPENAI_KEY, note: "Cobrado por imagem." },
];
export const KINDS: Kind[] = ["text", "video", "image"];
export const findProvider = (kind: Kind, id: string) => PROVIDERS.find((p) => p.kind === kind && p.id === id);

export type AiCfg = { provider: Provider; model: string; key: string; account: string };

type Env = Record<string, string | undefined>;
/**
 * Qual IA vale pelas variáveis de ambiente. Regra do dono: nada que cobre. Gemini no plano gratuito vale
 * quando há chave; a API da Anthropic é paga e só liga com RV_ALLOW_PAID_AI=1, mesmo com a chave presente.
 */
export function aiProvider(env: Env = process.env): "gemini" | "anthropic" | null {
  if (env.GEMINI_API_KEY) return "gemini";
  if (env.ANTHROPIC_API_KEY && env.RV_ALLOW_PAID_AI === "1") return "anthropic";
  return null;
}
function fromEnv(kind: Kind, env: Env = process.env): AiCfg | null {
  const which = aiProvider(env);
  if (!which || kind === "image" || (which === "anthropic" && kind !== "text")) return null;
  const provider = findProvider(kind, which === "gemini" ? "gemini-gratis" : "anthropic")!;
  // no gratuito a variável do servidor também só vale se o modelo estiver na lista
  const wanted = which === "gemini" ? env.GEMINI_MODEL : env.ANTHROPIC_MODEL;
  const model = wanted && (provider.paid || provider.models.includes(wanted)) ? wanted : provider.models[0];
  return { provider, model, key: (which === "gemini" ? env.GEMINI_API_KEY : env.ANTHROPIC_API_KEY)!, account: "" };
}

const saved = (kind: Kind) => getStore().findOne("ai_settings", (d) => d.kind === kind);

/** Chave guardada, ou null quando ela não abre mais (o segredo do servidor mudou). */
function openKey(stored: string) {
  try { return decrypt(stored); } catch (e: any) { console.error(`chave de IA ilegível: ${e?.message}`); return null; }
}

/** Qual IA usar nesta chamada. null = não há: quem chama usa o modelo local ou avisa. */
export async function getAi(kind: Kind, userId?: string): Promise<AiCfg | null> {
  const d = await saved(kind);
  if (!d) return fromEnv(kind);
  const provider = findProvider(kind, d.provider);
  if (!provider || !d.key) return null;
  // chave paga gera conta para o dono: convidado não gasta
  if (provider.paid && (!d.allowPaid || !userId || userId !== d.userId)) return null;
  const key = openKey(d.key);
  return key ? { provider, model: d.model || provider.models[0], key, account: d.account ?? "" } : null;
}

/** O que a tela pode saber: nunca a chave. */
export async function aiStatus(userId: string) {
  const owner = await isOwner(userId);
  const out = [];
  for (const kind of KINDS) {
    const d = await saved(kind);
    const active = await getAi(kind, userId);
    out.push({ kind, provider: (d?.provider as string) ?? "", model: owner ? ((d?.model as string) ?? "") : "", account: owner ? ((d?.account as string) ?? "") : "", hasKey: !!d?.key, brokenKey: !!d?.key && openKey(d.key) === null, allowPaid: !!d?.allowPaid, active: active ? `${active.provider.label} · ${active.model}` : "" });
  }
  return { owner, kinds: out };
}

export async function saveAi(userId: string, b: Record<string, unknown>) {
  if (!(await isOwner(userId))) throw new HttpError(403, "Só o dono pode configurar a IA.");
  const kind = String(b.kind) as Kind;
  if (!KINDS.includes(kind)) throw new HttpError(400, "Tipo de IA desconhecido.");
  const store = getStore();
  const [cur] = (await store.list("ai_settings", userId)).filter((d) => d.kind === kind);
  const write = (doc: Record<string, unknown>) => (cur ? store.update("ai_settings", cur.id, userId, doc) : store.insert("ai_settings", userId, doc, scopedId(userId, `ai_${kind}`)));
  // "Nenhum" fica gravado: sem registro, a chave do servidor voltaria a valer
  if (!b.provider) {
    await write({ kind, provider: "", model: "", key: "", account: "", allowPaid: false });
    return;
  }
  const provider = findProvider(kind, String(b.provider));
  if (!provider) throw new HttpError(400, "Provedor desconhecido.");
  const model = String(b.model ?? "").trim() || provider.models[0];
  // no gratuito só entram os modelos da lista: um nome digitado poderia ser de um modelo cobrado
  if (!provider.paid && !provider.models.includes(model)) throw new HttpError(400, "No plano gratuito escolha um modelo da lista.");
  if (!/^[A-Za-z0-9@./_-]{3,80}$/.test(model)) throw new HttpError(400, "Nome de modelo inválido.");
  const allowPaid = b.allowPaid === true;
  if (provider.paid && !allowPaid) throw new HttpError(400, "Esse provedor cobra por uso. Marque a autorização de cobrança para ligar.");
  const typed = String(b.key ?? "").trim();
  if (typed && !/^[A-Za-z0-9._-]{16,300}$/.test(typed)) throw new HttpError(400, "A chave não parece completa. Copie de novo.");
  const sameProvider = cur?.provider === provider.id && !!cur.key && openKey(cur.key) !== null;
  const key = typed ? encrypt(typed) : sameProvider ? cur.key : "";
  if (!key) throw new HttpError(400, "Cole a chave desse provedor.");
  const account = String(b.account ?? "").trim();
  if (provider.needsAccount && !/^[a-f0-9]{32}$/i.test(account)) throw new HttpError(400, "Informe o ID da conta da Cloudflare (32 letras e números).");
  const doc = { kind, provider: provider.id, model, key, account: provider.needsAccount ? account : "", allowPaid: provider.paid && allowPaid };
  await write(doc);
}

// ---------- chamadas ----------
async function call(url: string, init: RequestInit, timeoutMs: number): Promise<any> {
  const res = await fetch(url, { ...init, signal: AbortSignal.timeout(timeoutMs) });
  const j: any = await res.json().catch(() => null);
  if (!res.ok || !j) throw new Error(`A IA respondeu ${res.status}${j?.error?.message ? ": " + String(j.error.message).slice(0, 160) : j?.errors?.[0]?.message ? ": " + String(j.errors[0].message).slice(0, 160) : ""}`);
  return j;
}
const json = (headers: Record<string, string>, body: unknown): RequestInit => ({ method: "POST", headers: { "content-type": "application/json", ...headers }, body: JSON.stringify(body) });

const GEMINI = "https://generativelanguage.googleapis.com";
const gemini = (key: string, body: unknown, timeoutMs: number) => call(`${GEMINI}/v1beta/interactions`, json({ "x-goog-api-key": key, "Api-Revision": "2026-05-20" }, body), timeoutMs);
/** Partes de conteúdo da resposta da API de interações. */
const parts = (j: any): any[] => [...(j.steps ?? []).filter((s: any) => !s.type || s.type === "model_output").flatMap((s: any) => s.content ?? []), ...(j.outputs ?? [])];
const textOf = (list: any[]) => list.filter((p) => p?.type === "text" || (!p?.type && p?.text)).map((p) => p.text).join("");

/**
 * No gratuito é comum um modelo estar sem cota (429) ou lotado (503): tenta os outros gratuitos da lista.
 * No pago não troca, para não cobrar um modelo que o dono não escolheu.
 */
async function eachModel<T>(cfg: AiCfg, fn: (model: string) => Promise<T>): Promise<T> {
  const models = cfg.provider.paid ? [cfg.model] : [cfg.model, ...cfg.provider.models.filter((m) => m !== cfg.model)];
  for (let i = 0; ; i++) {
    try {
      return await fn(models[i]);
    } catch (e: any) {
      if (i + 1 >= models.length || !/respondeu (429|503)/.test(String(e?.message))) throw e;
    }
  }
}

/** timeoutMs é o prazo total, somando as trocas de modelo. */
export async function askText(cfg: AiCfg, system: string, user: string, timeoutMs = 90000): Promise<string> {
  const { api, base } = cfg.provider;
  const end = Date.now() + timeoutMs;
  const text = await eachModel(cfg, async (model) => {
    const ms = Math.max(1, end - Date.now());
    if (api === "gemini") return textOf(parts(await gemini(cfg.key, { model, system_instruction: system, input: user }, ms)));
    if (api === "anthropic") {
      const j = await call("https://api.anthropic.com/v1/messages", json({ "x-api-key": cfg.key, "anthropic-version": "2023-06-01" }, { model, max_tokens: 16000, system, messages: [{ role: "user", content: user }] }), ms);
      return (j.content ?? []).filter((c: any) => c.type === "text").map((c: any) => c.text).join("") as string;
    }
    if (api === "chat") {
      const j = await call(`${base}/chat/completions`, json({ authorization: `Bearer ${cfg.key}` }, { model, messages: [{ role: "system", content: system }, { role: "user", content: user }] }), ms);
      return (j.choices?.[0]?.message?.content ?? "") as string;
    }
    return "";
  });
  if (!text) throw new Error("A IA não devolveu texto.");
  return text;
}

const dataUrl = (b64: string) => `data:image/${b64.startsWith("iVBOR") ? "png" : "jpeg"};base64,${b64}`;

export async function askImage(cfg: AiCfg, prompt: string): Promise<string> {
  const { api } = cfg.provider;
  let b64: string | undefined;
  if (api === "cloudflare") {
    const j = await call(`https://api.cloudflare.com/client/v4/accounts/${cfg.account}/ai/run/${cfg.model}`, json({ authorization: `Bearer ${cfg.key}` }, { prompt: prompt.slice(0, 2048), steps: 4 }), 60000);
    b64 = j.result?.image ?? j.image;
  } else if (api === "gemini-image") {
    const j = await gemini(cfg.key, { model: cfg.model, input: prompt, response_format: { type: "image", mime_type: "image/jpeg", image_size: "1K" } }, 120000);
    b64 = j.output_image?.data ?? parts(j).find((p) => p?.type === "image")?.data;
  } else if (api === "openai-image") {
    const j = await call("https://api.openai.com/v1/images/generations", json({ authorization: `Bearer ${cfg.key}` }, { model: cfg.model, prompt, size: "1024x1536", output_format: "jpeg", output_compression: 80 }), 150000);
    b64 = j.data?.[0]?.b64_json;
  }
  if (!b64 || !/^[A-Za-z0-9+/]+={0,2}$/.test(b64)) throw new Error("A IA não devolveu uma imagem.");
  return dataUrl(b64);
}

const INLINE_MAX = 14 * 1024 * 1024; // em base64 fica abaixo dos 20 MB por pedido

/** Manda o vídeo para o Gemini assistir: direto no pedido quando é pequeno, pela API de arquivos quando é grande. */
export const VIDEO_BUDGET = 270_000; // abaixo dos 300 s da rota, para sobrar tempo de apagar o arquivo
export const VIDEO_SLOW = "A análise demorou demais para o servidor. Tente um vídeo menor.";

export async function askVideo(cfg: AiCfg, video: Buffer, mime: string, prompt: string, pollMs = 5000, deadline = Date.now() + VIDEO_BUDGET): Promise<string> {
  // um prazo só para todas as etapas: cada pedido recebe no máximo o que ainda resta
  const left = (cap: number) => {
    const ms = Math.min(cap, deadline - Date.now());
    if (ms <= 0) throw new Error(VIDEO_SLOW);
    return ms;
  };
  let part: Record<string, unknown>;
  if (video.length <= INLINE_MAX) part = { type: "video", data: video.toString("base64"), mime_type: mime };
  else {
    const start = await fetch(`${GEMINI}/upload/v1beta/files`, { method: "POST", headers: { "x-goog-api-key": cfg.key, "X-Goog-Upload-Protocol": "resumable", "X-Goog-Upload-Command": "start", "X-Goog-Upload-Header-Content-Length": String(video.length), "X-Goog-Upload-Header-Content-Type": mime, "content-type": "application/json" }, body: JSON.stringify({ file: { display_name: "analise" } }), signal: AbortSignal.timeout(left(30000)) });
    const url = start.headers.get("x-goog-upload-url");
    if (!start.ok || !url) throw new Error(`A IA recusou o envio do vídeo (${start.status}).`);
    let { file } = await call(url, { method: "POST", headers: { "X-Goog-Upload-Offset": "0", "X-Goog-Upload-Command": "upload, finalize" }, body: new Uint8Array(video) }, left(120000));
    for (let i = 0; file.state === "PROCESSING" && i < 30; i++) {
      await new Promise((r) => setTimeout(r, left(pollMs)));
      file = await call(`${GEMINI}/v1beta/${file.name}`, { headers: { "x-goog-api-key": cfg.key } }, left(20000));
    }
    if (file.state && file.state !== "ACTIVE") throw new Error("A IA não conseguiu preparar o vídeo. Tente um arquivo menor.");
    part = { type: "video", uri: file.uri, mime_type: mime };
  }
  const text = await eachModel(cfg, async (model) => textOf(parts(await gemini(cfg.key, { model, input: [part, { type: "text", text: prompt }] }, left(180000)))));
  if (!text) throw new Error("A IA não devolveu a análise.");
  return text;
}

/** Primeiro bloco JSON da resposta, ou null. */
export function readJson<T>(text: string): T | null {
  const m = text.match(/[\[{][\s\S]*[\]}]/);
  if (!m) return null;
  try { return JSON.parse(m[0]) as T; } catch { return null; }
}
