"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "@/lib/client";

export default function SignupView({ needsCode, invite }: { needsCode: boolean; invite: string }) {
  const r = useRouter();
  const [f, setF] = useState({ name: "", email: "", password: "", code: invite });
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <div className="hero-auth">
      <form className="card auth-card" onSubmit={async (e) => { e.preventDefault(); setBusy(true); setErr(""); try { await api("/api/auth/signup", { body: f }); r.push("/conexoes"); r.refresh(); } catch (x: any) { setErr(x.message); } finally { setBusy(false); } }}>
        <h2>Criar conta</h2>
        <p className="muted small">Teste por 30 dias com 30 créditos.</p>
        <div className="field"><label htmlFor="n">Seu nome</label><input id="n" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} required /></div>
        <div className="field"><label htmlFor="e">E-mail</label><input id="e" type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} required /></div>
        <div className="field"><label htmlFor="p">Senha (8+ caracteres)</label><input id="p" type="password" minLength={8} value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} required /></div>
        {needsCode && <div className="field"><label htmlFor="c">Código de cadastro ou convite</label><input id="c" value={f.code} onChange={(e) => setF({ ...f, code: e.target.value })} required /></div>}
        {err && <div className="err" role="alert">{err}</div>}
        <button className="btn primary" style={{ width: "100%" }} disabled={busy}>{busy ? "Criando..." : "Criar conta"}</button>
        <p className="small muted" style={{ marginTop: 14 }}>Já tem conta? <Link href="/login">Entrar</Link></p>
      </form>
    </div>
  );
}
