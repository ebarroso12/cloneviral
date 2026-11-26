"use client";
import { useState } from "react";
import { PageHead } from "@/components/ui";
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

export default function View({ rows }: { rows: any[] }) {
  const [tab, setTab] = useState<"roteiro" | "video" | "perfil">("roteiro");
  const [text, setText] = useState("");
  const [script, setScript] = useState<Check[] | null>(null);
  const [video, setVideo] = useState<Check[] | null>(null);
  const pick = async (f: File) => {
    const m = await probe(f);
    setVideo(reviewVideo({ ...m, size: f.size, ext: f.name.slice(f.name.lastIndexOf(".")) }));
  };
  return (
    <>
      <PageHead title="Sala de análise" desc="Confira antes de postar. A análise é automática, na hora e sem custo: mede texto e arquivo, não julga imagem nem atuação." />
      <div className="pill-tabs" style={{ marginBottom: 14 }}>{([["roteiro", "Roteiro"], ["video", "Vídeo"], ["perfil", "Perfil"]] as const).map(([k, n]) => <button key={k} className={tab === k ? "on" : ""} aria-pressed={tab === k} onClick={() => setTab(k)}>{n}</button>)}</div>
      {tab === "roteiro" && <><div className="card"><div className="field"><label htmlFor="rt">Cole o roteiro</label><textarea id="rt" style={{ minHeight: 160 }} value={text} onChange={(e) => setText(e.target.value)} /></div><button className="btn primary" disabled={!text.trim()} onClick={() => setScript(reviewScript(text))}>Analisar roteiro</button></div>{script && <Result list={script} />}</>}
      {tab === "video" && <><div className="card"><div className="field"><label htmlFor="av">Escolha o vídeo (MP4 ou MOV). Ele não sai do seu computador.</label><input id="av" type="file" accept=".mp4,.mov,video/mp4,video/quicktime" onChange={(e) => e.target.files?.[0] && pick(e.target.files[0])} /></div></div>{video && <Result list={video} />}</>}
      {tab === "perfil" && <Perfil rows={rows} />}
    </>
  );
}
