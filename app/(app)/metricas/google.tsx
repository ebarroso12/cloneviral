"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { api } from "@/lib/client";
import { fmtDate, fmtDec, fmtInt } from "@/lib/format";
import type { googleReport } from "@/lib/googleData";

type Report = Awaited<ReturnType<typeof googleReport>>;
const PERIODS = [7, 28, 90] as const;

function Card({ title, value, note }: { title: string; value: string; note?: string }) {
  return (
    <div className="card">
      <div className="muted small">{title}</div>
      <div style={{ fontSize: 28, fontWeight: 700, margin: "6px 0" }}>{value}</div>
      {note && <div className="tiny dim">{note}</div>}
    </div>
  );
}

/** Busca pelo nome no Google → cliques → visitas → WhatsApp. Sem dado, mostra aviso e --, nunca zero. */
export default function GoogleBlock() {
  const [days, setDays] = useState<(typeof PERIODS)[number]>(28);
  const [data, setData] = useState<Report | null>(null);
  const [notice, setNotice] = useState("");
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    let current = true;
    setData(null);
    setNotice("");
    api<Report | { aviso: string }>(`/api/google/report?dias=${days}`)
      .then((r) => { if (current) "aviso" in r ? setNotice(r.aviso) : setData(r); })
      .catch((e) => {
        if (!current) return;
        if (/só do dono/.test(e.message)) setHidden(true);
        else setNotice(e.message);
      });
    return () => { current = false; };
  }, [days]);

  if (hidden) return null;
  const s = data?.search;
  const site = data?.site;
  const n = (v: number | undefined) => (v === undefined ? "--" : fmtInt(v));

  return (
    <section aria-label="Google" style={{ marginTop: 22 }}>
      <div className="row between wrap" style={{ marginBottom: 10 }}>
        <h2>Google</h2>
        <div className="chips" role="group" aria-label="Período do Google">{PERIODS.map((d) => <button key={d} className="chip" aria-pressed={days === d} onClick={() => setDays(d)}>{d} dias</button>)}</div>
      </div>
      {notice ? (
        <div className="card empty">{notice} <Link href="/conexoes">Ir para Conexões</Link></div>
      ) : !data || !site ? (
        <div className="muted small">Consultando o Google...</div>
      ) : (
        <>
          <p className="muted small">De {fmtDate(`${data.start}T12:00:00Z`)} a {fmtDate(`${data.end}T12:00:00Z`)} {s && <> · nome pesquisado: <b>{data.term}</b></>}</p>
          {s && !s.ok && <div className="card err" style={{ marginBottom: 10 }}>Busca (Search Console): {s.error}</div>}
          {!site.ok && <div className="card err" style={{ marginBottom: 10 }}>Site (Analytics): {site.error}</div>}
          <h3 style={{ margin: "6px 0 8px" }}>Busca gratuita</h3>
          <div className={"grid " + (s ? "g4" : "g2")}>
            {s && <Card title="Apareceu na busca" value={n(s.ok ? s.impressions : undefined)} note="vezes, nas buscas com o nome" />}
            {s && <Card title="Cliques" value={n(s.ok ? s.clicks : undefined)} note={s.ok && s.ctr !== null && s.position !== null ? `${fmtDec(s.ctr * 100)}% clicaram · posição média ${fmtDec(s.position)}` : "nas buscas com o nome"} />}
            <Card title="Visitas vindas do Google" value={n(site.ok ? site.visits : undefined)} note="todas as buscas" />
            <Card title="Cliques no WhatsApp" value={n(site.ok ? site.whatsapp : undefined)} note="nas visitas vindas do Google" />
          </div>
          <h3 style={{ margin: "16px 0 8px" }}>Anúncios do Google (pagos)</h3>
          <div className="grid g2">
            <Card title="Visitas pelos anúncios" value={n(site.ok ? site.adsVisits : undefined)} note="não entram na busca gratuita" />
            <Card title="WhatsApp pelos anúncios" value={n(site.ok ? site.adsWhatsapp : undefined)} note="cliques nas visitas pagas" />
          </div>
          {s?.ok && (
            <div className="card" style={{ marginTop: 14 }}>
              <h3>O que digitaram</h3>
              {s.queries.length === 0 ? <p className="muted small">Nenhum termo com o nome apareceu neste período.</p> : s.queries.map((q) => (
                <div key={q.query} className="row between" style={{ borderBottom: "1px solid #172043", padding: "8px 0", alignItems: "flex-start" }}>
                  <span style={{ overflowWrap: "anywhere" }}>{q.query}</span>
                  <span className="muted small" style={{ whiteSpace: "nowrap" }}>{fmtInt(q.impressions)} vezes · {fmtInt(q.clicks)} {q.clicks === 1 ? "clique" : "cliques"}</span>
                </div>
              ))}
            </div>
          )}
          <p className="tiny dim" style={{ marginTop: 10 }}>{s ? "Na busca gratuita, os dois primeiros números são só das buscas com o nome. Os dois últimos contam todas as visitas vindas da busca do Google: o Analytics não informa a palavra pesquisada." : "A busca gratuita conta todas as visitas vindas da busca do Google, não só as de quem procurou o seu nome. A busca pelo nome aparece aqui quando o site for verificado no Search Console e escolhido na tela Conexões."}</p>
          <p className="tiny dim">{s ? "Os dados da busca chegam com alguns dias de atraso, por isso o período inteiro termina três dias atrás. O Google esconde buscas muito raras. " : "O período vai até ontem, e o número do último dia ainda pode mudar. "}O Analytics só conta a partir de quando a medição foi instalada no site.</p>
        </>
      )}
    </section>
  );
}
