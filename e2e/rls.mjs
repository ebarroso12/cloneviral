// Prova da regra de acesso (0002) num Postgres embutido, em memória. Rodar na raiz do projeto:
//   npm i --no-save @electric-sql/pglite && node e2e/rls.mjs
import { PGlite } from "@electric-sql/pglite";
import crypto from "node:crypto";
import fs from "node:fs";

const db = new PGlite();
const mig = (f) => fs.readFileSync(`supabase/migrations/${f}`, "utf8");
console.log((await db.query("select version()")).rows[0].version.slice(0, 40));
await db.exec("create role anon nologin; create role authenticated nologin; grant usage on schema public to anon, authenticated;");
await db.exec(mig("0001_app_docs.sql"));
await db.exec(mig("0002_acesso_por_segredo.sql"));
await db.exec(mig("0002_acesso_por_segredo.sql"));
console.log("migrações aplicadas (a 0002 duas vezes)");
const secret = "segredo-de-teste-com-mais-de-trinta-e-dois-caracteres";
await db.query("insert into private.rv_key (hash) values ($1)", [crypto.createHash("sha256").update(secret).digest("hex")]);
await db.exec("insert into app_docs (id, collection, user_id) values ('existente','ideas','u')");

let fail = 0;
async function como(role, headers, sql) {
  await db.exec("begin");
  try {
    await db.exec(`set local role ${role}`);
    if (headers !== null) await db.query("select set_config('request.headers', $1, true)", [headers]);
    const r = await db.query(sql);
    return { ok: true, rows: r.rows.length, affected: r.affectedRows ?? 0, first: r.rows[0] };
  } catch (e) {
    return { ok: false, error: e.message };
  } finally {
    await db.exec("rollback");
  }
}
function expect(name, cond, got) {
  console.log(`${cond ? "passou" : "FALHOU"}  ${name}${cond ? "" : "  " + JSON.stringify(got)}`);
  if (!cond) fail++;
}
const OPS = {
  ler: "select * from app_docs",
  inserir: "insert into app_docs (id, collection, user_id) values ('novo','ideas','u') returning id",
  alterar: "update app_docs set data = '{\"a\":1}' where id = 'existente' returning id",
  apagar: "delete from app_docs where id = 'existente' returning id",
};
const right = JSON.stringify({ "x-rv-key": secret });
for (const [name, sql] of Object.entries(OPS)) {
  const r = await como("anon", right, sql);
  expect(`com segredo: ${name}`, r.ok && r.rows === 1, r);
}
for (const [label, h] of [["segredo errado", '{"x-rv-key":"errado"}'], ["sem cabeçalho", "{}"], ["cabeçalho vazio", ""], ["requisição sem headers", null]]) {
  for (const [name, sql] of Object.entries(OPS)) {
    const r = await como("anon", h, sql);
    const denied = name === "inserir" ? !r.ok && /row-level security/.test(r.error) : (r.ok && r.rows === 0) || (!r.ok && /row-level security/i.test(r.error));
    expect(`${label}: ${name} negado`, denied, r);
  }
}
const k = await como("anon", right, "select hash from private.rv_key");
expect("anon não lê o resumo do segredo", !k.ok || k.rows === 0, k);
const k2 = await como("anon", right, "insert into private.rv_key (hash) values ('x') returning hash");
expect("anon não cadastra segredo novo", !k2.ok, k2);
const a = await como("authenticated", right, "select * from app_docs");
expect("outro papel não lê", !a.ok || a.rows === 0, a);
const end = (await db.query("select id, data from app_docs")).rows;
expect("linha original intacta", end.length === 1 && JSON.stringify(end[0].data) === "{}", end);
console.log(fail ? `${fail} FALHAS` : "todas as provas passaram");
process.exit(fail ? 1 : 0);
