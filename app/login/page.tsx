"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "@/lib/client";

export default function Login() {
  const r = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <div className="hero-auth">
      <form className="card auth-card" onSubmit={async (e) => { e.preventDefault(); setBusy(true); setErr(""); try { await api("/api/auth/login", { body: { email, password } }); r.push("/metricas"); r.refresh(); } catch (x: any) { setErr(x.message); } finally { setBusy(false); } }}>
        <h2>Entrar no Radar Viral</h2>
        <p className="muted small">Use a conta de demonstração ou crie a sua.</p>
        <div className="field"><label htmlFor="e">E-mail</label><input id="e" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" /></div>
        <div className="field"><label htmlFor="p">Senha</label><input id="p" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password" /></div>
        {err && <div className="err" role="alert">{err}</div>}
        <button className="btn primary" style={{ width: "100%" }} disabled={busy}>{busy ? "Entrando..." : "Entrar"}</button>
        <button type="button" className="btn ghost" style={{ width: "100%", marginTop: 8 }} onClick={() => { setEmail("demo@radarviral.app"); setPassword("demo-radar-2026"); }}>Preencher conta de demonstração</button>
        <p className="small muted" style={{ marginTop: 14 }}>Ainda não tem conta? <Link href="/signup">Criar conta (30 créditos de teste)</Link></p>
      </form>
    </div>
  );
}
