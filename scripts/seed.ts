// Recria a conta de demonstração do zero: npm run seed
import fs from "node:fs";
import path from "node:path";
const file = path.join(process.cwd(), "data", "db.json");
if (fs.existsSync(file)) fs.rmSync(file);
(async () => {
  const { ensureSeed, DEMO_EMAIL, DEMO_PASSWORD } = await import("../lib/seed");
  const { flushStore } = await import("../lib/store");
  await ensureSeed();
  await flushStore();
  console.log(`Conta de demonstração pronta: ${DEMO_EMAIL} / ${DEMO_PASSWORD}`);
})();
