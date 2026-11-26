// Chaves do app da Meta: vêm do ambiente ou são gravadas pelo dono na tela Conexões (segredo cifrado).
import { getStore, scopedId } from "./store";
import { encrypt, decrypt, envMeta, type MetaCfg } from "./instagram";
import { isOwner } from "./invites";
import { HttpError } from "./auth";

async function saved() {
  return getStore().findOne("meta_app", () => true);
}

export async function metaConfig(): Promise<MetaCfg | null> {
  const env = envMeta();
  if (env) return env;
  const d = await saved();
  return d ? { appId: d.appId, secret: decrypt(d.secret), configId: d.configId ?? "" } : null;
}

/** O que a tela pode saber: nunca o segredo. */
export async function metaStatus() {
  const env = envMeta();
  if (env) return { configured: true, fromServer: true, appId: env.appId, configId: env.configId };
  const d = await saved();
  return { configured: !!d, fromServer: false, appId: (d?.appId as string) ?? "", configId: (d?.configId as string) ?? "" };
}

export async function saveMetaApp(userId: string, b: { appId?: unknown; secret?: unknown; configId?: unknown }) {
  if (!(await isOwner(userId))) throw new HttpError(403, "Só o dono pode configurar o app da Meta.");
  const appId = String(b.appId ?? "").trim();
  const secret = String(b.secret ?? "").trim();
  const configId = String(b.configId ?? "").trim();
  if (!/^\d{8,20}$/.test(appId)) throw new HttpError(400, "O ID do app tem só números. Copie de novo nas configurações do app na Meta.");
  if (!/^[A-Za-z0-9]{20,64}$/.test(secret)) throw new HttpError(400, "A chave secreta não parece completa. Copie de novo nas configurações do app na Meta.");
  if (configId && !/^\d{5,25}$/.test(configId)) throw new HttpError(400, "O ID da configuração tem só números.");
  const store = getStore();
  const doc = { appId, secret: encrypt(secret), configId };
  const [cur] = await store.list("meta_app", userId);
  if (cur) await store.update("meta_app", cur.id, userId, doc);
  else await store.insert("meta_app", userId, doc, scopedId(userId, "meta"));
}
