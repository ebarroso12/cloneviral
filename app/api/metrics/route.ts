import { route } from "@/lib/api";
import { getStore } from "@/lib/store";
import { computeMetrics, type Period, type Post, type Snap, type Audience } from "@/lib/metrics";

export const GET = route(async (user, req) => {
  const url = new URL(req.url);
  const period = (["hoje", "ontem", "7d", "30d"].includes(url.searchParams.get("period") ?? "") ? url.searchParams.get("period") : "30d") as Period;
  const s = getStore();
  const [posts, snaps, aud, conn, ads] = await Promise.all([s.list("posts", user.id), s.list("snapshots", user.id), s.list("audience", user.id), s.list("ig_connection", user.id), s.list("ads_connection", user.id)]);
  const m = computeMetrics(posts as unknown as Post[], snaps as unknown as Snap[], (aud[0] as unknown as Audience) ?? null, period, { adViews: ads[0]?.status === "connected" ? (ads[0].views as number) : null });
  return { ...m, connection: conn[0] ?? null, posts: posts.length };
});
