"use client";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { api } from "@/lib/client";
import { Modal, PageHead, useToast } from "@/components/ui";

const MES = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const probe = (f: File) => new Promise<{ duration: number; width: number; height: number }>((res) => { const v = document.createElement("video"); v.preload = "metadata"; v.onloadedmetadata = () => res({ duration: v.duration, width: v.videoWidth, height: v.videoHeight }); v.onerror = () => res({ duration: 0, width: 0, height: 0 }); v.src = URL.createObjectURL(f); });

export default function PlanejadorView({ line, posts, videos, scripts, real }: any) {
  const r = useRouter();
  const { toast, node } = useToast();
  const [ref, setRef] = useState(() => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1); });
  const [day, setDay] = useState<string | null>(null);
  const [f, setF] = useState<any>({ time: "18:00", caption: "", videoId: "", scriptId: "", kind: "viral", autoPublish: false });
  const [lineS, setLineS] = useState(line);
  const [up, setUp] = useState(false);
  const [saving, setSaving] = useState(false);
  const todayIso = iso(new Date());
  const cells = useMemo(() => { const first = ref.getDay(); const n = new Date(ref.getFullYear(), ref.getMonth() + 1, 0).getDate(); return [...Array(first).fill(null), ...Array.from({ length: n }, (_, i) => new Date(ref.getFullYear(), ref.getMonth(), i + 1))]; }, [ref]);
  const monthPosts = posts.filter((p: any) => p.date.startsWith(iso(ref).slice(0, 7)));
  const count = (k: string) => monthPosts.filter((p: any) => p.kind === k).length;
  const saveLine = async (n: any) => { setLineS(n); await api("/api/c/editorial_line", { body: n }); };
  const upload = async (file: File) => {
    setUp(true);
    try {
      if (!/\.(mp4|mov)$/i.test(file.name)) throw new Error("Formato inválido. Use MP4 ou MOV.");
      if (file.size > 100 * 1024 * 1024) throw new Error("O vídeo passa de 100 MB.");
      const m = await probe(file);
      if (m.duration > 180) throw new Error("O vídeo passa de 3 minutos.");
      const fd = new FormData(); fd.append("file", file); fd.append("duration", String(Math.round(m.duration))); fd.append("width", String(m.width)); fd.append("height", String(m.height));
      await api("/api/upload", { body: fd }); toast("Vídeo enviado."); r.refresh();
    } catch (e: any) { toast(e.message, "err"); } finally { setUp(false); }
  };
  const schedule = async () => {
    if (!day || saving) return;
    setSaving(true);
    try {
      await api("/api/schedule", { body: { date: day, time: f.time, caption: f.caption, videoId: f.videoId || null, scriptId: f.scriptId || null, kind: f.kind, autoPublish: real && !!f.videoId && f.autoPublish } });
      toast("Post agendado.");
      setDay(null);
      // o próximo agendamento começa limpo: vídeo e publicação automática não se repetem sozinhos
      setF({ ...f, caption: "", videoId: "", scriptId: "", autoPublish: false });
      r.refresh();
    } catch (e: any) { toast(e.message, "err"); } finally { setSaving(false); }
  };
  const del = async (id: string) => { await api(`/api/c/scheduled_posts?id=${id}`, { method: "DELETE" }); r.refresh(); };
  const inDay = day ? posts.filter((p: any) => p.date === day) : [];
  return (
    <>
      <PageHead title="Planejador editorial" desc="Planeje o mês: quantos posts de cada tipo, o vídeo de cada dia e o horário." />
      <div className="card" style={{ marginBottom: 14 }}>
        <h2>Linha editorial do mês</h2>
        <div className="grid g3" style={{ marginTop: 10 }}>
          {([["viral", "Virais"], ["emocional", "Emocionais"], ["tecnico", "Técnicos"]] as const).map(([k, n]) => (
            <div key={k} className="card" style={{ background: "var(--card2)" }}>
              <div className="muted small">{n}</div>
              <div className="row between"><b style={{ fontSize: 22 }}>{count(k)} / {lineS[k]}</b><div className="row"><button className="btn sm" aria-label={`Menos ${n}`} onClick={() => saveLine({ ...lineS, [k]: Math.max(0, lineS[k] - 1) })}>−</button><button className="btn sm" aria-label={`Mais ${n}`} onClick={() => saveLine({ ...lineS, [k]: lineS[k] + 1 })}>+</button></div></div>
            </div>
          ))}
        </div>
      </div>
      <div className="card">
        <div className="row between"><button className="btn sm" aria-label="Mês anterior" onClick={() => setRef(new Date(ref.getFullYear(), ref.getMonth() - 1, 1))}>←</button><h2>{MES[ref.getMonth()]} de {ref.getFullYear()}</h2><button className="btn sm" aria-label="Próximo mês" onClick={() => setRef(new Date(ref.getFullYear(), ref.getMonth() + 1, 1))}>→</button></div>
        <div className="cal" style={{ marginTop: 12 }}>
          {["dom", "seg", "ter", "qua", "qui", "sex", "sáb"].map((d) => <div key={d} className="head">{d}</div>)}
          {cells.map((d, i) => d ? (
            <button key={i} className={"d" + (iso(d) < todayIso ? " past" : "") + (iso(d) === todayIso ? " today" : "")} onClick={() => setDay(iso(d))} aria-label={`Dia ${d.getDate()}`}>
              {d.getDate()}{posts.filter((p: any) => p.date === iso(d)).map((p: any) => <span key={p.id} className="evt">{p.time} {p.kind}</span>)}
            </button>
          ) : <div key={i} />)}
        </div>
        <p className="muted tiny" style={{ marginTop: 10 }}>{real ? "Marque Publicar sozinho ao agendar um vídeo. O app precisa estar aberto no horário." : "Conecte uma conta real do Instagram para publicar automaticamente. Até lá o planejador organiza os posts."}</p>
      </div>
      <div className="card" style={{ marginTop: 14 }}>
        <div className="row between"><h2>Vídeos</h2><label className="btn primary" style={{ cursor: "pointer" }}>{up ? "Enviando..." : "Enviar vídeo"}<input type="file" accept=".mp4,.mov,video/mp4,video/quicktime" hidden onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} /></label></div>
        <p className="muted tiny">MP4 ou MOV, até 100 MB e 3 minutos.</p>
        {videos.length === 0 ? <div className="empty">Nenhum vídeo enviado.</div> : <ul className="muted small">{videos.map((v: any) => <li key={v.id}>{v.name} · {(v.size / 1048576).toFixed(1)} MB · {v.duration}s</li>)}</ul>}
      </div>
      {day && (
        <Modal onClose={() => setDay(null)} title={`Dia ${day.split("-").reverse().join("/")}`}>
          {inDay.map((p: any) => <div key={p.id} className="row between" style={{ marginBottom: 6 }}><span>{p.time} · {p.kind} · {p.caption.slice(0, 40)} <span className={"tag " + (p.status === "publicado" ? "green" : p.status === "agendado" ? "" : "yellow")}>{p.status}{p.autoPublish ? " · automático" : ""}</span>{p.error && <div className="tiny err">{p.error}</div>}</span><button className="btn sm danger" onClick={() => del(p.id)}>Remover</button></div>)}
          <div className="grid g2">
            <div className="field"><label htmlFor="h">Horário</label><input id="h" type="time" value={f.time} onChange={(e) => setF({ ...f, time: e.target.value })} /></div>
            <div className="field"><label htmlFor="k">Tipo</label><select id="k" value={f.kind} onChange={(e) => setF({ ...f, kind: e.target.value })}><option value="viral">Viral</option><option value="emocional">Emocional</option><option value="tecnico">Técnico</option></select></div>
          </div>
          <div className="field"><label htmlFor="v">Vídeo</label><select id="v" value={f.videoId} onChange={(e) => setF({ ...f, videoId: e.target.value })}><option value="">Sem vídeo</option>{videos.map((v: any) => <option key={v.id} value={v.id}>{v.name}</option>)}</select></div>
          <div className="field"><label htmlFor="s">Roteiro</label><select id="s" value={f.scriptId} onChange={(e) => { const sc = scripts.find((x: any) => x.id === e.target.value); setF({ ...f, scriptId: e.target.value, caption: sc ? `${sc.hook}\n\n${sc.cta}` : f.caption }); }}><option value="">Nenhum</option>{scripts.map((s: any) => <option key={s.id} value={s.id}>{s.title}</option>)}</select></div>
          <div className="field"><label htmlFor="c">Legenda</label><textarea id="c" value={f.caption} onChange={(e) => setF({ ...f, caption: e.target.value })} /></div>
          <label className="row small" style={{ marginBottom: 12 }}><input type="checkbox" style={{ width: "auto" }} checked={real && !!f.videoId && f.autoPublish} disabled={!real || !f.videoId} onChange={(e) => setF({ ...f, autoPublish: e.target.checked })} /> Publicar sozinho no Instagram neste horário</label>
          <p className="tiny muted">{!real ? "Disponível depois de conectar a sua conta real em Conexões." : !f.videoId ? "Escolha um vídeo para liberar a publicação automática." : "O app precisa estar aberto no horário. Com mais de 6 horas de atraso ele não publica e avisa."}</p>
          <button className="btn primary" onClick={schedule} disabled={saving}>{saving ? "Agendando..." : "Agendar"}</button>
        </Modal>
      )}
      {node}
    </>
  );
}
