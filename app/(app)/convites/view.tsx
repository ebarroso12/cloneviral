"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "@/lib/client";
import { PageHead, useToast } from "@/components/ui";

export default function ConvitesView({ open }: { open: number }) {
  const r = useRouter();
  const { toast, node } = useToast();
  const [invite, setInvite] = useState<{ code: string; link: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const create = async () => {
    setBusy(true);
    try { setInvite(await api("/api/invites", { body: {} })); r.refresh(); } catch (e: any) { toast(e.message, "err"); } finally { setBusy(false); }
  };
  const cancel = async () => {
    if (!confirm("Cancelar todos os convites que ainda não foram usados?")) return;
    try { await api("/api/invites", { method: "DELETE" }); setInvite(null); toast("Convites cancelados."); r.refresh(); } catch (e: any) { toast(e.message, "err"); }
  };
  return (
    <>
      <PageHead title="Convidar pessoas" desc="Cada convite serve para uma pessoa e vale por 7 dias. Cada pessoa vê somente os próprios dados." />
      <div className="card">
        <button className="btn primary" onClick={create} disabled={busy}>{busy ? "Gerando..." : "Gerar convite"}</button>
        {invite && (
          <div style={{ marginTop: 14 }}>
            <div className="field"><label htmlFor="l">Link do convite (aparece só agora)</label><input id="l" readOnly value={invite.link} onFocus={(e) => e.target.select()} /></div>
            <button className="btn" onClick={() => navigator.clipboard.writeText(invite.link).then(() => toast("Link copiado."), () => toast("Selecione o link e copie.", "err"))}>Copiar link</button>
            <p className="muted small">Se a pessoa preferir digitar, o código é <code>{invite.code}</code>.</p>
          </div>
        )}
        <p className="muted small" style={{ marginTop: 14 }}>{open === 0 ? "Nenhum convite aguardando uso." : `${open} ${open === 1 ? "convite aguardando" : "convites aguardando"} uso.`}</p>
        {open > 0 && <button className="btn danger" onClick={cancel}>Cancelar convites pendentes</button>}
      </div>
      {node}
    </>
  );
}
