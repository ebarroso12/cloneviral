"use client";
export async function api<T = any>(url: string, opts: { method?: string; body?: any } = {}): Promise<T> {
  const res = await fetch(url, { method: opts.method ?? (opts.body ? "POST" : "GET"), headers: opts.body instanceof FormData ? undefined : { "content-type": "application/json" }, body: opts.body instanceof FormData ? opts.body : opts.body ? JSON.stringify(opts.body) : undefined });
  const j = await res.json().catch(() => ({}));
  if (!res.ok) {
    const e: any = new Error(j.error || "Algo deu errado.");
    e.status = res.status;
    throw e;
  }
  return j as T;
}
