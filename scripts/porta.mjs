// Quem está na porta? "livre", "nosso" (o app já aberto) ou "ocupada" por outro programa.
import net from "node:net";

export async function portState(port) {
  const busy = await new Promise((resolve) => {
    const s = net.connect({ port, host: "127.0.0.1" });
    s.setTimeout(1500);
    s.on("connect", () => { s.destroy(); resolve(true); });
    s.on("timeout", () => { s.destroy(); resolve(false); });
    s.on("error", () => resolve(false));
  });
  if (!busy) return "livre";
  try {
    const r = await fetch(`http://127.0.0.1:${port}/privacidade`, { signal: AbortSignal.timeout(15000) });
    return (await r.text()).includes("Radar Viral") ? "nosso" : "ocupada";
  } catch {
    return "ocupada";
  }
}
