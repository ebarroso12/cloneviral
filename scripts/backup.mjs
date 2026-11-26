// Cópia diária do banco local, guardando as 14 mais recentes. Arquivo ilegível nunca entra no lugar de um bom.
import fs from "node:fs";
import path from "node:path";

export function backupDb(dataDir, now = new Date()) {
  const db = path.join(dataDir, "db.json");
  if (!fs.existsSync(db)) return "sem-dados";
  const content = fs.readFileSync(db, "utf8");
  try {
    JSON.parse(content);
  } catch {
    return "invalido";
  }
  const dir = path.join(dataDir, "backups");
  fs.mkdirSync(dir, { recursive: true });
  const copy = path.join(dir, `db-${now.toISOString().slice(0, 10)}.json`);
  if (fs.existsSync(copy)) return "ja-existe";
  fs.writeFileSync(copy, content);
  const old = fs.readdirSync(dir).filter((f) => /^db-\d{4}-\d{2}-\d{2}\.json$/.test(f)).sort().slice(0, -14);
  for (const f of old) fs.rmSync(path.join(dir, f));
  return "ok";
}
