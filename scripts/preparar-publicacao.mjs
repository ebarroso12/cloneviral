// Monta em publicacao/ (fora do GitHub) o que falta colar no Supabase e na Vercel. Não acessa a rede.
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

/** Gera os arquivos. Se as chaves já existem, não mexe: trocá-las invalidaria o que já foi gravado. */
export function preparar(raiz, destino) {
  const envFile = path.join(destino, "2-vercel.env");
  if (fs.existsSync(envFile)) return { criado: false, destino };
  const nova = (bytes = 32) => crypto.randomBytes(bytes).toString("hex");
  const vars = { RV_DB_KEY: nova(), RV_SECRET: nova(), RV_SIGNUP_CODE: nova(10), CRON_SECRET: nova() };
  const migracoes = ["0001_app_docs.sql", "0002_acesso_por_segredo.sql"].map((f) => fs.readFileSync(path.join(raiz, "supabase", "migrations", f), "utf8").trimEnd());
  const resumo = crypto.createHash("sha256").update(vars.RV_DB_KEY).digest("hex");
  const sql = [...migracoes, `-- resumo do segredo (o segredo em si fica só na Vercel)\ninsert into private.rv_key (hash) values ('${resumo}') on conflict do nothing;`, ""].join("\n\n");
  const env = ["# Preencha as duas primeiras com os dados do seu projeto Supabase (Project Settings > API).", "SUPABASE_URL=", "SUPABASE_ANON_KEY=", ...Object.entries(vars).map(([k, v]) => `${k}=${v}`), ""].join("\n");
  fs.mkdirSync(destino, { recursive: true });
  fs.writeFileSync(path.join(destino, "1-supabase.sql"), sql);
  fs.writeFileSync(envFile, env, { flag: "wx" });
  return { criado: true, destino };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  const { criado, destino } = preparar(raiz, path.join(raiz, "publicacao"));
  console.log(criado ? `Arquivos criados em ${destino}` : `Já existiam em ${destino}; nada foi alterado.`);
}
