"use client";
import { useEffect, useRef, useState } from "react";

export function Tip({ label, children }: { label: string; children: React.ReactNode }) {
  const [hover, setHover] = useState(false);
  const [pinned, setPinned] = useState(false);
  const open = hover || pinned;
  const ref = useRef<HTMLSpanElement>(null);
  const close = () => { setHover(false); setPinned(false); };
  useEffect(() => {
    if (!open) return;
    const out = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) close(); };
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") close(); };
    document.addEventListener("mousedown", out);
    document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("mousedown", out); document.removeEventListener("keydown", esc); };
  }, [open]);
  return (
    <span ref={ref} style={{ position: "relative", display: "inline-flex" }} onPointerEnter={(e) => e.pointerType === "mouse" && setHover(true)} onPointerLeave={(e) => e.pointerType === "mouse" && setHover(false)}>
      <button type="button" className="info-btn" aria-label={label} aria-expanded={open} onClick={() => (pinned ? close() : setPinned(true))}>i</button>
      {open && <span role="tooltip" className="tip" style={{ top: 22, left: -8 }}>{children}</span>}
    </span>
  );
}

export function Modal({ onClose, children, title }: { onClose: () => void; children: React.ReactNode; title?: string }) {
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [onClose]);
  return (
    <div className="modal-bg" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" role="dialog" aria-modal="true" aria-label={title} style={{ position: "relative" }}>
        <button className="close" onClick={onClose} aria-label="Fechar">×</button>
        {children}
      </div>
    </div>
  );
}

export function Sparkline({ data, label, color = "#4da3ff", w = 254, h = 68 }: { data: { date: string; value: number }[]; label: string; color?: string; w?: number; h?: number }) {
  if (data.length < 2) return <div className="muted small">Ainda sem dados suficientes.</div>;
  const vals = data.map((d) => d.value);
  const min = Math.min(...vals), max = Math.max(...vals);
  const span = max - min || 1;
  const pts = data.map((d, i) => [(i / (data.length - 1)) * (w - 8) + 4, h - 8 - ((d.value - min) / span) * (h - 16)] as const);
  const line = pts.map((p, i) => `${i ? "L" : "M"}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" ");
  const area = `${line} L${pts[pts.length - 1][0]},${h} L${pts[0][0]},${h} Z`;
  const gid = "g" + label.length + vals.length;
  return (
    <svg role="img" aria-label={label} width="100%" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" style={{ maxWidth: w * 1.6, height: h }}>
      <defs><linearGradient id={gid} x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor={color} stopOpacity=".35" /><stop offset="1" stopColor={color} stopOpacity="0" /></linearGradient></defs>
      <path d={area} fill={`url(#${gid})`} />
      <path d={line} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={pts[pts.length - 1][0]} cy={pts[pts.length - 1][1]} r="3" fill={color} />
    </svg>
  );
}

export function Bar({ pct, green }: { pct: number; green?: boolean }) {
  return <div className={"bar" + (green ? " green" : "")} role="progressbar" aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100}><i style={{ width: `${Math.max(0, Math.min(100, pct))}%` }} /></div>;
}

export function Toast({ msg, kind = "ok", onDone }: { msg: string; kind?: "ok" | "err"; onDone: () => void }) {
  useEffect(() => { const t = setTimeout(onDone, 4200); return () => clearTimeout(t); }, [onDone]);
  return <div role="status" style={{ position: "fixed", bottom: 22, left: "50%", transform: "translateX(-50%)", background: kind === "ok" ? "#0d2a21" : "#2a1219", border: `1px solid ${kind === "ok" ? "#14543f" : "#5a2230"}`, color: kind === "ok" ? "#6ee7b7" : "#fca5a5", padding: "10px 16px", borderRadius: 12, zIndex: 200, maxWidth: "90vw" }}>{msg}</div>;
}

export function useToast() {
  const [t, setT] = useState<{ msg: string; kind: "ok" | "err" } | null>(null);
  const node = t ? <Toast msg={t.msg} kind={t.kind} onDone={() => setT(null)} /> : null;
  return { toast: (msg: string, kind: "ok" | "err" = "ok") => setT({ msg, kind }), node };
}

export function PageHead({ title, desc, right }: { title: string; desc?: string; right?: React.ReactNode }) {
  return (
    <div style={{ margin: "6px 0 18px" }}>
      <div className="row between wrap"><h1>{title}</h1>{right}</div>
      {desc && <p className="muted" style={{ marginTop: 8, maxWidth: 760 }}>{desc}</p>}
    </div>
  );
}
