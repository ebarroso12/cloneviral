"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PageHead, useToast } from "@/components/ui";
import { api } from "@/lib/client";
import { sendVideo } from "@/lib/sendVideo";
import { fmtDateTimePt } from "@/lib/format";
import { reviewScript, reviewVideo, type Check } from "@/lib/review";
import Perfil from "./perfil";

const probe = (f: File) => new Promise<{ duration: number; width: number; height: number }>((res) => {
  const v = document.createElement("video");
  const url = URL.createObjectURL(f);
  const end = (r: { duration: number; width: number; height: number }) => { URL.revokeObjectURL(url); res(r); };
  v.preload = "metadata";
  v.onloadedmetadata = () => end({ duration: v.duration, width: v.videoWidth, height: v.videoHeight });
  v.onerror = () => end({ duration: 0, width: 0, height: 0 });
  v.src = url;
});

function Result({ list }: { list: Check[] }) {
  return <div className="card" style={{ marginTop: 14 }}>{list.map((c) => <div key={c.item} style={{ margin: "10px 0" }}><div className="row"><b>{c.item}</b><span className={"tag " + (c.status === "bom" ? "green" : "yellow")}>{c.status}</span></div><div className="muted small">{c.advice}</div></div>)}</div>;
}

export default function View({ rows, site, ai }: { rows: any[]; site: boolean; ai: boolean }) {
  const r = useRouter();
  const { toast, node } = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [step, setStep] = useState("");
  const watch = async () => {
    if (!file) return;
    try {
      setStep("Enviando...");
      const v = await sendVideo(file, { ...(await probe(file)), source: "analise" }, site, (p) => setStep(`Enviando ${p}%`));
      setStep("A IA está assistindo...");
      await api("/api/clube/video", { body: { videoId: v.id } });
      toast("Análise do vídeo pronta.");
      r.refresh();
    } catch (e: any) { toast(e.message, "err"); } finally { setStep(""); }
  };
  const [tab, setTab] = useState<"roteiro" | "video" | "perfil">("roteiro");
  const [text, setText] = useState("");
  const [script, setScript] = useState<Check[] | null>(null);
  const [video, setVideo] = useState<Check[] | null>(null);
  const pick = async (f: File) => {
    setFile(f);
    const m = await probe(f);
    setVideo(reviewVideo({ ...m, size: f.size, ext: f.name.slice(f.name.lastIndexOf(".")) }));
  };
  return (
    <>
      <PageHead title="Sala de análise" desc="Confira antes de postar. A conferência do roteiro e do arquivo é na hora; com o Gemini ligado, a IA assiste ao vídeo." />
      <div className="pill-tabs" style={{ marginBottom: 14 }}>{([["roteiro", "Roteiro"], ["video", "Vídeo"], ["perfil", "Perfil"]] as const).map(([k, n]) => <button key={k} className={tab === k ? "on" : ""} aria-pressed={tab === k} onClick={() => setTab(k)}>{n}</button>)}</div>
      {tab === "roteiro" && <><div className="card"><div className="field"><label htmlFor="rt">Cole o roteiro</label><textarea id="rt" style={{ minHeight: 160 }} value={text} onChange={(e) => setText(e.target.value)} /></div><button className="btn primary" disabled={!text.trim()} onClick={() => setScript(reviewScript(text))}>Analisar roteiro</button></div>{script && <Result list={script} />}</>}
      {tab === "video" && <><div className="card"><div className="field"><label htmlFor="av">Escolha o vídeo (MP4 ou MOV). A conferência do arquivo é feita no seu aparelho.</label><input id="av" type="file" accept=".mp4,.mov,video/mp4,video/quicktime" onChange={(e) => e.target.files?.[0] && pick(e.target.files[0])} /></div></div>{video && <Result list={video} />}
        <div className="card" style={{ marginTop: 14 }}>
          <b>Análise por IA</b>
          {ai ? <p className="muted small">O vídeo é enviado ao Google para a análise e apagado do app em seguida. {site ? "Até 50 MB." : ""}</p> : <p className="muted small">Para a IA assistir ao vídeo, ligue o Gemini em <Link href="/ia">IA e integrações</Link>.</p>}
          <button className="btn primary" disabled={!ai || !file || !!step} onClick={watch}>{step || "Analisar com IA"}</button>
        </div>
        {rows.filter((a) => a.kind === "video").map((a) => <div key={a.id}><h3 style={{ marginTop: 18 }}>{a.name}</h3><p className="muted tiny">{fmtDateTimePt(a.createdAt)} · {a.model}</p>{a.summaryText && <p style={{ whiteSpace: "pre-wrap" }}>{a.summaryText}</p>}{a.checks.length > 0 && <Result list={a.checks} />}</div>)}
      </>}
      {tab === "perfil" && <Perfil rows={rows.filter((a) => a.kind !== "video")} />}
      {node}
    </>
  );
}
