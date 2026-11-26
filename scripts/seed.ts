// Recria a conta de demonstração: npm run seed. Recusa apagar um banco com conta real (use --force).
import fs from "node:fs";
import path from "node:path";

(async () => {
  const { ensureSeed, DEMO_EMAIL, DEMO_PASSWORD } = await import("../lib/seed");
  const { flushStore, dataDir } = await import("../lib/store");
  const { demoEnabled } = await import("../lib/config");
  if (!demoEnabled()) throw new Error("A demonstração está desligada neste ambiente (veja RV_DEMO).");
  const file = path.join(dataDir(), "db.json");
  if (fs.existsSync(file)) {
    const users = Object.values(JSON.parse(fs.readFileSync(file, "utf8")).users ?? {}) as { demo?: boolean }[];
    if (users.some((u) => !u.demo) && !process.argv.includes("--force")) throw new Error(`${file} tem conta real. Nada foi apagado. Use --force se quiser apagar mesmo assim.`);
    fs.copyFileSync(file, file + ".bak");
    fs.rmSync(file);
  }
  await ensureSeed();
  await flushStore();
  console.log(`Conta de demonstração pronta: ${DEMO_EMAIL} / ${DEMO_PASSWORD}`);
})().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
