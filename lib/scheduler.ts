// Agendador do uso local: enquanto o app está aberto, publica o que venceu e coleta os números uma vez por dia.
import { publishDue } from "./publish";
import { syncAccount } from "./instagram";
import { getStore } from "./store";

const g = globalThis as unknown as { __scheduler?: NodeJS.Timeout; __syncing?: boolean };

async function dailySync() {
  if (g.__syncing) return;
  g.__syncing = true;
  try {
    const conns = await getStore().findAll("ig_connection", (c) => !c.demo && c.status === "connected");
    for (const c of conns) {
      const age = Date.now() - Date.parse(c.lastSync ?? "1970-01-01");
      // coleta incompleta continua logo; completa, só no dia seguinte
      if (age > (c.syncPartial ? 10 * 60_000 : 20 * 3600_000)) await syncAccount(c.userId, { deadlineMs: 120_000 });
    }
  } finally {
    g.__syncing = false;
  }
}

export function startScheduler() {
  if (g.__scheduler) return;
  const tick = () => {
    publishDue().catch((e) => console.error("publicação agendada:", e.message));
    dailySync().catch((e) => console.error("coleta diária:", e.message));
  };
  g.__scheduler = setInterval(tick, 60_000);
  setTimeout(tick, 5_000);
}
