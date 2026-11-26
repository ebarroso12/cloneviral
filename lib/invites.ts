// Convites: o dono gera um código de uso único; o banco guarda só o resumo dele.
import crypto from "node:crypto";
import { getStore, scopedId } from "./store";
import { HttpError } from "./auth";

const DAYS = 7;
const hash = (code: string) => crypto.createHash("sha256").update(code.trim().toLowerCase()).digest("hex");

/** Dono é a primeira conta real criada. */
export async function isOwner(userId: string) {
  const users = await getStore().findAll("users", (u) => !u.demo);
  users.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  return users[0]?.id === userId;
}

export async function createInvite(userId: string) {
  if (!(await isOwner(userId))) throw new HttpError(403, "Só o dono da conta principal pode convidar.");
  const code = crypto.randomBytes(8).toString("hex");
  const expiresAt = new Date(Date.now() + DAYS * 86400000).toISOString();
  await getStore().insert("invites", userId, { hash: hash(code), expiresAt }, scopedId(userId, `inv_${hash(code).slice(0, 16)}`));
  return { code, expiresAt };
}

/** Gasta o convite. Só devolve true para quem realmente o apagou. */
export async function claimInvite(code: string) {
  if (!code.trim()) return false;
  const store = getStore();
  const h = hash(code);
  const doc = await store.findOne("invites", (d) => d.hash === h);
  if (!doc || Date.parse(doc.expiresAt) < Date.now() || !(await isOwner(doc.userId))) return false;
  return store.remove("invites", doc.id, doc.userId);
}
