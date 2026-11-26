// Abre o app para uso no próprio computador: prepara o segredo local, constrói se preciso e serve em localhost.
import { spawn, spawnSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1")), "..").replace(/%20/g, " ");
process.chdir(root);
const next = path.join(root, "node_modules", "next", "dist", "bin", "next");
const port = process.env.PORT || "3000";
const env = { ...process.env, NEXT_TELEMETRY_DISABLED: "1" };

if (!fs.existsSync(next)) {
  console.error("Faltam as dependências. Rode uma vez: npm ci");
  process.exit(1);
}
if (!fs.existsSync(".env.local")) {
  // cifra o token do Instagram guardado neste computador; não vai para o git
  fs.writeFileSync(".env.local", `RV_SECRET=${crypto.randomBytes(32).toString("hex")}\n`, { flag: "wx" });
  console.log("Criei .env.local com um segredo novo. Guarde esse arquivo junto com a pasta data.");
}
// reconstrói quando o código mudou desde a última construção
const marca = path.join(".next", "BUILD_ID");
const maisNovo = (dir) => fs.readdirSync(dir, { withFileTypes: true }).reduce((m, e) => {
  const p = path.join(dir, e.name);
  return Math.max(m, e.isDirectory() ? maisNovo(p) : fs.statSync(p).mtimeMs);
}, 0);
const construir = !fs.existsSync(marca) || Math.max(...["app", "components", "lib"].map(maisNovo), fs.statSync("package.json").mtimeMs) > fs.statSync(marca).mtimeMs;
if (construir) {
  console.log("Preparando o app (leva alguns minutos na primeira vez)...");
  const r = spawnSync(process.execPath, [next, "build"], { stdio: "inherit", env });
  if (r.status !== 0) process.exit(r.status ?? 1);
}
console.log(`\nApp em http://localhost:${port}  (feche esta janela para encerrar)\n`);
// só no próprio computador: não fica visível para outros aparelhos da rede
const server = spawn(process.execPath, [next, "start", "-H", "127.0.0.1", "-p", port], { stdio: "inherit", env });
server.on("exit", (c) => process.exit(c ?? 0));
if (!process.env.RV_NO_BROWSER && process.platform === "win32") setTimeout(() => spawn("cmd", ["/c", "start", "", `http://localhost:${port}`], { detached: true, stdio: "ignore" }).unref(), 4000);
