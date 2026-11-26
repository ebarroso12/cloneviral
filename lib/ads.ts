// Anúncios Meta. A leitura real (escopo ads_read) ainda não existe: o total simulado é só da demonstração.
export function adsConnectionData(conn: { demo?: boolean } | undefined, organicViews: number) {
  if (!conn?.demo) throw new Error("A leitura de anúncios da sua conta ainda não está implementada. Nenhum número é estimado.");
  return { status: "connected", views: Math.round(organicViews * 0.18), demo: true };
}

export function adViewsFor(conn: { demo?: boolean } | undefined, ads: { status?: string; views?: number; demo?: boolean } | undefined) {
  if (!ads || ads.status !== "connected") return null;
  if (ads.demo && !conn?.demo) return null;
  return ads.views ?? null;
}
