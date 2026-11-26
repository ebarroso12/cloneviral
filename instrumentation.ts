export async function register() {
  // só no servidor Node e quando o atalho local pede (RV_SCHEDULER=1)
  if (process.env.NEXT_RUNTIME === "nodejs" && process.env.RV_SCHEDULER === "1") {
    const { startScheduler } = await import("./lib/scheduler");
    startScheduler();
  }
}
