"use client";
import { useState } from "react";
import { api } from "@/lib/client";
import { PageHead, PasswordInput, useToast } from "@/components/ui";

export default function ContaView({ name, email }: { name: string; email: string }) {
  const { toast, node } = useToast();
  const [pass, setPass] = useState("");
  const erase = async () => {
    if (!confirm("Apagar a sua conta e todos os dados? Não dá para desfazer.")) return;
    try { await api("/api/account", { method: "DELETE", body: { password: pass } }); window.location.href = "/login"; } catch (e: any) { toast(e.message, "err"); }
  };
  return (
    <>
      <PageHead title="Minha conta" desc="Uso sem limite: não há plano, prazo nem créditos." />
      <div className="card"><b>{name}</b><div className="muted small">{email}</div></div>
      <div className="card" style={{ marginTop: 14 }}>
        <h2>Excluir a conta</h2>
        <p className="muted small">Apaga o perfil, os números coletados, os textos, os vídeos e o acesso ao Instagram guardado aqui. Não há como desfazer.</p>
        <div className="row wrap"><span style={{ width: "100%", maxWidth: 260 }}><PasswordInput aria-label="Sua senha para excluir" placeholder="Sua senha" value={pass} onChange={(e) => setPass(e.target.value)} /></span><button className="btn danger" disabled={!pass} onClick={erase}>Excluir a conta</button></div>
        <p className="tiny muted" style={{ marginTop: 10 }}><a href="/privacidade">Privacidade</a> · <a href="/termos">Termos de uso</a></p>
      </div>
      {node}
    </>
  );
}
