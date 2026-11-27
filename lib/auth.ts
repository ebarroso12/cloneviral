import crypto from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getStore, uid, type Doc } from "./store";
import { ensureSeed } from "./seed";
import { signupAllowed, demoEnabled } from "./config";
import { hashPassword, verifyPassword } from "./password";
import { claimInvite } from "./invites";

const COOKIE = "rv_session";
const SESSION_DAYS = 30;

const tokenHash = (t: string) => crypto.createHash("sha256").update(t).digest("hex");

export async function signup(name: string, email: string, password: string, code = "") {
  const store = getStore();
  email = email.trim().toLowerCase();
  if (!/^\S+@\S+\.\S+$/.test(email)) throw new Error("E-mail inválido.");
  if (password.length < 8) throw new Error("A senha precisa ter ao menos 8 caracteres.");
  const owner = await store.findOne("users", (u) => !u.demo);
  const open = signupAllowed(process.env, !!owner, code);
  if (!open && !(owner && code.trim())) throw new Error(!owner && process.env.RV_SIGNUP_CODE ? "Código de cadastro incorreto." : "O cadastro está fechado neste servidor. Peça um convite ao dono.");
  const exists = await store.findOne("users", (u) => u.email === email);
  if (exists) throw new Error("Já existe uma conta com esse e-mail.");
  // o convite só é gasto depois que o resto foi conferido
  if (!open && !(await claimInvite(code))) throw new Error("Convite inválido, já usado ou vencido.");
  const id = uid();
  await store.insert("users", id, { name: name.trim() || email.split("@")[0], email, password: hashPassword(password) }, id);
  return id;
}

// Freio contra tentativa de senha em série: 5 erros bloqueiam o e-mail por 15 minutos (por processo).
const failures = new Map<string, { n: number; until: number }>();

export async function login(email: string, password: string) {
  await ensureSeed();
  const key = email.trim().toLowerCase();
  const f = failures.get(key);
  if (f && f.n >= 5 && Date.now() < f.until) throw new Error("Muitas tentativas. Espere 15 minutos.");
  const store = getStore();
  const u = await store.findOne("users", (x) => x.email === key);
  if (!u || (u.demo && !demoEnabled()) || !verifyPassword(password, u.password)) {
    const prev = f && Date.now() < f.until ? f.n : 0;
    failures.set(key, { n: prev + 1, until: Date.now() + 15 * 60000 });
    throw new Error("E-mail ou senha incorretos.");
  }
  failures.delete(key);
  return u.id;
}

export async function createSession(userId: string) {
  const token = crypto.randomBytes(32).toString("hex");
  const store = getStore();
  await store.insert("sessions", userId, { tokenHash: tokenHash(token), expiresAt: new Date(Date.now() + SESSION_DAYS * 86400000).toISOString() });
  const jar = await cookies();
  jar.set(COOKIE, token, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: SESSION_DAYS * 86400 });
}

export async function destroySession() {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (token) {
    const store = getStore();
    const s = await store.findOne("sessions", (x) => x.tokenHash === tokenHash(token));
    if (s) await store.remove("sessions", s.id, s.userId);
  }
  jar.delete(COOKIE);
}

export type SessionUser = Doc & { name: string; email: string };

export async function getUser(): Promise<SessionUser | null> {
  await ensureSeed();
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (!token) return null;
  const store = getStore();
  const s = await store.findOne("sessions", (x) => x.tokenHash === tokenHash(token));
  if (!s || new Date(s.expiresAt) < new Date()) return null;
  const u = await store.get("users", s.userId);
  if (u?.demo && !demoEnabled()) return null;
  return (u as SessionUser) ?? null;
}

export async function requireUser(): Promise<SessionUser> {
  const u = await getUser();
  if (!u) redirect("/login");
  return u;
}

/** Para rotas de API: devolve usuário ou lança resposta 401. */
export async function apiUser(): Promise<SessionUser> {
  const u = await getUser();
  if (!u) throw new HttpError(401, "Faça login para continuar.");
  return u;
}

export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}
