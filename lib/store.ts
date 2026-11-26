// Camada de dados. Duas implementações com a mesma interface:
//  - FileStore: JSON em ./data/db.json (sem custo, padrão)
//  - SupabaseStore: tabela app_docs via PostgREST (quando SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY existem)
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

export type Doc = { id: string; userId: string; createdAt: string; updatedAt: string; [k: string]: any };

export interface Store {
  list(collection: string, userId: string, filter?: (d: Doc) => boolean): Promise<Doc[]>;
  get(collection: string, id: string): Promise<Doc | null>;
  insert(collection: string, userId: string, data: Record<string, any>, id?: string): Promise<Doc>;
  update(collection: string, id: string, userId: string, patch: Record<string, any>): Promise<Doc | null>;
  remove(collection: string, id: string, userId: string): Promise<boolean>;
  removeAllForUser(collection: string, userId: string): Promise<void>;
  findOne(collection: string, predicate: (d: Doc) => boolean): Promise<Doc | null>;
  /** Atravessa contas: só para rotinas do servidor, nunca para responder a um usuário. */
  findAll(collection: string, predicate: (d: Doc) => boolean): Promise<Doc[]>;
}

const now = () => new Date().toISOString();
export const uid = () => crypto.randomUUID();
export const dataDir = () => process.env.RV_DATA_DIR || path.join(process.cwd(), "data");
/** Chaves fixas (conexão, snapshot do dia, post do Instagram) são sempre de um usuário. */
export const scopedId = (userId: string, key: string) => `${userId}:${key}`;
/** Remove do corpo enviado pelo navegador o que só o servidor define. */
export function clientData(body: Record<string, any>) {
  const { id: _i, userId: _u, createdAt: _c, updatedAt: _up, ...rest } = body ?? {};
  return rest as Record<string, any>;
}
/** Versão de um documento que pode ir para o navegador (sem segredos). */
export function publicDoc<T extends Record<string, any>>(doc: T) {
  const { token: _t, ...rest } = doc;
  return rest;
}
const foreign = () => new Error("Esse identificador pertence a outra conta.");

export class FileStore implements Store {
  private file: string;
  private db: Record<string, Record<string, Doc>> = {};
  private loaded = false;
  constructor(file: string) {
    this.file = file;
  }
  private load() {
    if (this.loaded) return;
    fs.mkdirSync(path.dirname(this.file), { recursive: true });
    if (fs.existsSync(this.file)) {
      try {
        this.db = JSON.parse(fs.readFileSync(this.file, "utf8"));
      } catch {
        // seguir com um banco vazio apagaria tudo na próxima gravação
        throw new Error(`Banco local corrompido: ${this.file}. O arquivo foi preservado; restaure um backup ou renomeie-o.`);
      }
    }
    this.loaded = true;
  }
  private timer: NodeJS.Timeout | null = null;
  private save() {
    // debounce: grava em lote (posts são milhares) e de forma atômica
    if (this.timer) return;
    this.timer = setTimeout(() => {
      this.timer = null;
      const tmp = this.file + ".tmp";
      fs.writeFileSync(tmp, JSON.stringify(this.db));
      fs.renameSync(tmp, this.file);
    }, 150);
  }
  flush() {
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
    const tmp = this.file + ".tmp";
    fs.writeFileSync(tmp, JSON.stringify(this.db));
    fs.renameSync(tmp, this.file);
  }
  private col(c: string) {
    this.load();
    return (this.db[c] ||= {});
  }
  async list(c: string, userId: string, filter?: (d: Doc) => boolean) {
    const out = Object.values(this.col(c)).filter((d) => d.userId === userId);
    return filter ? out.filter(filter) : out;
  }
  async get(c: string, id: string) {
    return this.col(c)[id] ?? null;
  }
  async insert(c: string, userId: string, data: Record<string, any>, id?: string) {
    const doc: Doc = { ...data, id: id ?? data.id ?? uid(), userId, createdAt: data.createdAt ?? now(), updatedAt: now() };
    const cur = this.col(c)[doc.id];
    if (cur && cur.userId !== userId) throw foreign();
    this.col(c)[doc.id] = doc;
    this.save();
    return doc;
  }
  async update(c: string, id: string, userId: string, patch: Record<string, any>) {
    const cur = this.col(c)[id];
    if (!cur || cur.userId !== userId) return null;
    const next = { ...cur, ...patch, id: cur.id, userId: cur.userId, updatedAt: now() };
    this.col(c)[id] = next;
    this.save();
    return next;
  }
  async remove(c: string, id: string, userId: string) {
    const cur = this.col(c)[id];
    if (!cur || cur.userId !== userId) return false;
    delete this.col(c)[id];
    this.save();
    return true;
  }
  async removeAllForUser(c: string, userId: string) {
    const col = this.col(c);
    for (const [k, v] of Object.entries(col)) if (v.userId === userId) delete col[k];
    this.save();
  }
  async findOne(c: string, predicate: (d: Doc) => boolean) {
    return Object.values(this.col(c)).find(predicate) ?? null;
  }
  async findAll(c: string, predicate: (d: Doc) => boolean) {
    return Object.values(this.col(c)).filter(predicate);
  }
}

const q = encodeURIComponent;

class SupabaseStore implements Store {
  constructor(private url: string, private key: string) {}
  private h(extra: Record<string, string> = {}) {
    return { apikey: this.key, Authorization: `Bearer ${this.key}`, "Content-Type": "application/json", ...extra };
  }
  private rowToDoc(r: any): Doc {
    return { ...r.data, id: r.id, userId: r.user_id, createdAt: r.created_at, updatedAt: r.updated_at };
  }
  private async page(query: string): Promise<any[]> {
    const out: any[] = [];
    for (let from = 0; ; from += 1000) {
      const res = await fetch(`${this.url}/rest/v1/app_docs?${query}`, { headers: this.h({ Range: `${from}-${from + 999}` }), cache: "no-store" });
      if (!res.ok) throw new Error(`supabase list ${res.status}`);
      const rows = await res.json();
      out.push(...rows);
      if (rows.length < 1000) break;
    }
    return out;
  }
  async list(c: string, userId: string, filter?: (d: Doc) => boolean) {
    const rows = await this.page(`collection=eq.${q(c)}&user_id=eq.${q(userId)}&order=created_at.asc`);
    const docs = rows.map((r) => this.rowToDoc(r));
    return filter ? docs.filter(filter) : docs;
  }
  async get(c: string, id: string) {
    const rows = await this.page(`collection=eq.${q(c)}&id=eq.${q(id)}`);
    return rows[0] ? this.rowToDoc(rows[0]) : null;
  }
  async insert(c: string, userId: string, data: Record<string, any>, id?: string) {
    const { id: _i, userId: _u, createdAt, updatedAt: _up, ...rest } = data;
    const body = { id: id ?? data.id ?? uid(), collection: c, user_id: userId, data: rest, created_at: createdAt ?? now(), updated_at: now() };
    const [owner] = await this.page(`id=eq.${q(body.id)}`);
    if (owner && (owner.user_id !== userId || owner.collection !== c)) throw foreign();
    const res = await fetch(`${this.url}/rest/v1/app_docs`, { method: "POST", headers: this.h({ Prefer: "return=representation,resolution=merge-duplicates" }), body: JSON.stringify(body) });
    if (!res.ok) throw new Error(`supabase insert ${res.status} ${await res.text()}`);
    return this.rowToDoc((await res.json())[0]);
  }
  async update(c: string, id: string, userId: string, patch: Record<string, any>) {
    const cur = await this.get(c, id);
    if (!cur || cur.userId !== userId) return null;
    const { id: _i, userId: _u, createdAt, updatedAt: _up, ...rest } = { ...cur, ...patch };
    const res = await fetch(`${this.url}/rest/v1/app_docs?collection=eq.${q(c)}&id=eq.${q(id)}&user_id=eq.${q(userId)}`, { method: "PATCH", headers: this.h({ Prefer: "return=representation" }), body: JSON.stringify({ data: rest, updated_at: now() }) });
    if (!res.ok) throw new Error(`supabase update ${res.status}`);
    return this.rowToDoc((await res.json())[0]);
  }
  async remove(c: string, id: string, userId: string) {
    const res = await fetch(`${this.url}/rest/v1/app_docs?collection=eq.${q(c)}&id=eq.${q(id)}&user_id=eq.${q(userId)}`, { method: "DELETE", headers: this.h() });
    return res.ok;
  }
  async removeAllForUser(c: string, userId: string) {
    await fetch(`${this.url}/rest/v1/app_docs?collection=eq.${q(c)}&user_id=eq.${q(userId)}`, { method: "DELETE", headers: this.h() });
  }
  async findOne(c: string, predicate: (d: Doc) => boolean) {
    // usado só em users/sessions: coleções pequenas
    const rows = await this.page(`collection=eq.${q(c)}`);
    return rows.map((r) => this.rowToDoc(r)).find(predicate) ?? null;
  }
  async findAll(c: string, predicate: (d: Doc) => boolean) {
    const rows = await this.page(`collection=eq.${q(c)}`);
    return rows.map((r) => this.rowToDoc(r)).filter(predicate);
  }
}

const g = globalThis as unknown as { __store?: Store };
export function getStore(): Store {
  if (g.__store) return g.__store;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  g.__store = url && key ? new SupabaseStore(url, key) : new FileStore(path.join(dataDir(), "db.json"));
  return g.__store;
}
export function flushStore() {
  const s = getStore() as any;
  if (typeof s.flush === "function") s.flush();
}
