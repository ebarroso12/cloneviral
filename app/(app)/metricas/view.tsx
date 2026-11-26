"use client";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { api } from "@/lib/client";
import { Bar, Modal, PageHead, Sparkline, Tip, useToast } from "@/components/ui";
import { fmtCompact, fmtDate, fmtDateTimePt, fmtDec, fmtInt, fmtPct, fmtShort, timeAgo } from "@/lib/format";
import { TYPE_LABEL, type Post } from "@/lib/metrics";

type Row = { label: string; count: number; pct: number };
type M = any;
const PERIODS: [string, string][] = [["hoje", "Hoje"], ["ontem", "Ontem"], ["7d", "7 dias"], ["30d", "30 dias"]];
const TOP: [string, string][] = [["views", "Visualizações"], ["reach", "Alcance"], ["likes", "Curtidas"], ["comments", "Comentários"], ["saves", "Salvamentos"], ["shares", "Compartilhamentos"]];

export default function MetricasView() {
  const [period, setPeriod] = useState("30d");
  const [m, setM] = useState<M | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [top, setTop] = useState("views");
  const [open, setOpen] = useState<Post | null>(null);
  const [syncing, setSyncing] = useState(false);
  const { toast, node } = useToast();

  const load = useCallback(async (p: string) => {
    setM(await api(`/api/metrics?period=${p}`));
  }, []);
  useEffect(() => { load(period); }, [period, load]);
  const loadPosts = useCallback(() => api<Post[]>("/api/c/posts").then((r) => setPosts([...r].sort((a, b) => b.publishedAt.localeCompare(a.publishedAt)))), []);
  useEffect(() => { loadPosts(); }, [loadPosts]);

  if (!m) return <div className="muted" style={{ padding: 40 }}>Carregando as suas métricas...</div>;
  const c = m.connection;
  const e = m.engagement;
  const au = m.authenticity;
  const topList: Post[] = m.top[top];

  return (
    <>
      <PageHead
        title="Métricas"
        right={<div className="chips" role="group" aria-label="Período">{PERIODS.map(([k, l]) => <button key={k} className="chip" aria-pressed={period === k} onClick={() => setPeriod(k)}>{l}</button>)}</div>}
        desc="O período vale para Crescimento de seguidores e Alcance diário. O resto desta tela não muda quando você troca de período: são os números da última coleta."
      />
      {!c || c.status !== "connected" ? (
        <div className="card empty">{c?.status === "reautorizar" ? "A autorização do Instagram venceu; os números abaixo são da última coleta. " : "Conecte o seu Instagram para ver as métricas. "}<Link href="/conexoes">Ir para Conexões</Link></div>
      ) : (
        <div className="card" style={{ display: "flex", gap: 18, alignItems: "flex-start", flexWrap: "wrap" }}>
          {c.picture ? <img className="avatar" src={c.picture} alt={`Foto de perfil de ${c.name}`} width={76} height={76} style={{ width: 76, height: 76, objectFit: "cover" }} /> : <div className="avatar" style={{ width: 76, height: 76, fontSize: 28 }} aria-hidden>{(c.name || "?").charAt(0)}</div>}
          <div style={{ flex: 1, minWidth: 240 }}>
            <div className="row wrap"><b style={{ fontSize: 18 }}>{c.name}</b><span className="muted">@{c.igUsername}</span></div>
            <div style={{ margin: "6px 0" }}><span className="tag green">Conectado</span>{c.demo && <span className="tag yellow" style={{ marginLeft: 8 }}>Conta de demonstração</span>}</div>
            <p style={{ whiteSpace: "pre-line", margin: "6px 0" }}>{c.bio}</p>
            {c.link && <a href={`https://${String(c.link).replace(/^https?:\/\//, "")}`} target="_blank" rel="noreferrer">{String(c.link).replace(/^https?:\/\//, "")}</a>}
            <p className="muted small" style={{ marginTop: 10 }}>Conta profissional · autorização renovada a cada 90 dias · última sincronização {fmtDateTimePt(c.lastSync)}</p>
          </div>
          <button className="btn sm" disabled={syncing} onClick={async () => { setSyncing(true); try { const r = await api("/api/ig/sync", { method: "POST", body: {} }); toast(r.demo ? "Conta de demonstração: os dados já são os mais recentes." : r.partial ? "Parte dos dados foi atualizada. Sincronize de novo para continuar." : r.warnings.length ? "Atualizado com avisos. Veja abaixo." : "Dados atualizados.", r.warnings?.length ? "err" : "ok"); await load(period); await loadPosts(); } catch (x: any) { toast(x.message, "err"); } finally { setSyncing(false); } }}>{syncing ? "Sincronizando..." : "Sincronizar agora"}</button>
        </div>
      )}

      {(c?.syncWarnings?.length > 0 || c?.syncPartial) && (
        <div className="card warn" role="status" style={{ marginTop: 14 }}>
          <b>A última coleta ficou incompleta</b>
          {c.syncPartial && <p className="small">Ainda há posts sem métricas detalhadas. Sincronize de novo para continuar.</p>}
          <ul className="small muted">{(c.syncWarnings ?? []).map((w: string) => <li key={w}>{w}</li>)}</ul>
        </div>
      )}

      <div className="grid g4" style={{ marginTop: 14 }}>
        <div className="card kpi"><div className="label">Seguidores</div><div className="value blue">{fmtInt(m.profile.followers)}</div></div>
        <div className="card kpi">
          <div className="label">Visualizações <Tip label="Como eu chego neste número de visualizações">Orgânico é quanto as suas publicações foram vistas, e conta a vida inteira de cada uma, desde {m.posts ? fmtDate(posts[posts.length - 1]?.publishedAt ?? new Date().toISOString()) : "o começo"}.</Tip></div>
          <div className="value">{fmtCompact(m.views.total)}</div>
          <div className="sub">{m.views.ads == null ? "soma das suas publicações · não inclui anúncio" : `publicações ${fmtCompact(m.views.organic)} · impressões de anúncios ${fmtCompact(m.views.ads)}`}</div>
        </div>
        <div className="card kpi"><div className="label">Seguindo</div><div className="value">{fmtInt(m.profile.following)}</div></div>
        <div className="card kpi"><div className="label">Publicações</div><div className="value">{fmtInt(m.profile.mediaCount)}</div></div>
      </div>
      <p className="muted small" style={{ margin: "10px 2px" }}>Estes quatro números são da última coleta{m.profile.lastSnapshot ? `, de ${fmtDateTimePt(c?.lastSync ?? m.profile.lastSnapshot)}` : ""}. Eles não mudam quando você troca o período.</p>

      <div className="grid g2">
        <div className="card">
          <h3>Crescimento de seguidores</h3>
          <div style={{ fontSize: 26, fontWeight: 700, color: m.growth.delta >= 0 ? "var(--green)" : "var(--red)" }}>{m.growth.delta >= 0 ? "+" : ""}{m.growth.delta} seguidores</div>
          <div className="muted small">{m.growth.label}</div>
          <Sparkline data={m.growth.series} label={`seguidores de ${m.growth.series[0] ? fmtShort(m.growth.series[0].date) : ""} a ${m.growth.series.at(-1) ? fmtShort(m.growth.series.at(-1).date) : ""}, de ${fmtInt(m.growth.series[0]?.value ?? 0)} a ${fmtInt(m.growth.series.at(-1)?.value ?? 0)}. ${m.growth.allMeasured ? "todos os dias do período foram medidos." : "alguns dias não foram medidos."}`} />
          <div className="row between tiny muted"><span>{m.growth.series[0] && fmtShort(m.growth.series[0].date)}</span><span>{m.growth.series.at(-1) && fmtShort(m.growth.series.at(-1).date)}</span></div>
          {!m.growth.allMeasured && <div className="tiny" style={{ color: "var(--yellow)", marginTop: 6 }}>Alguns dias do período ainda não foram medidos.</div>}
        </div>
        <div className="card">
          <h3>Alcance diário</h3>
          <div className="muted small">contas alcançadas por dia</div>
          <div className="muted small">{m.reachDaily.label}</div>
          <Sparkline color="#8b5cf6" data={m.reachDaily.series} label={`alcance de ${m.reachDaily.series[0] ? fmtShort(m.reachDaily.series[0].date) : ""} a ${m.reachDaily.series.at(-1) ? fmtShort(m.reachDaily.series.at(-1).date) : ""}, de ${fmtInt(m.reachDaily.series[0]?.value ?? 0)} a ${fmtInt(m.reachDaily.series.at(-1)?.value ?? 0)}. ${m.reachDaily.allMeasured ? "todos os dias do período foram medidos." : "alguns dias não foram medidos."}`} />
          <div className="row between tiny muted"><span>{m.reachDaily.series[0] && fmtShort(m.reachDaily.series[0].date)}</span><span>{m.reachDaily.series.at(-1) && fmtShort(m.reachDaily.series.at(-1).date)}</span></div>
        </div>
      </div>

      <div className="card" style={{ marginTop: 14 }}>
        <h2>Análise de engajamento</h2>
        <div className="muted small" style={{ marginBottom: 14 }}>{fmtInt(e.postsMeasured)} posts medidos · sem filtro de período</div>
        <div className="grid g3">
          <div className="kpi"><div className="label">Engajamento real</div><div className="value">{fmtPct(e.real, 2)}</div><div className="sub">interações ÷ alcance</div></div>
          <div className="kpi"><div className="label">Sobre seguidores</div><div className="value">{fmtPct(e.onFollowers, 1)}</div><div className="sub">interações ÷ seguidores</div></div>
          <div className="kpi"><div className="label">Alcance sobre seguidores</div><div className="value">{fmtDec(e.reachOnFollowers, 2)}</div><div className="sub">alcance ÷ seguidores</div></div>
          <div className="kpi"><div className="label">Alcance total</div><div className="value">{fmtCompact(e.totalReach)}</div></div>
          <div className="kpi"><div className="label">Interações totais</div><div className="value">{fmtCompact(e.totalInteractions)}</div></div>
          <div className="kpi"><div className="label">Autenticidade <Tip label="Como eu chego nesta nota de autenticidade">Três sinais das suas publicações: quanto do seu público o post alcança, quantas curtidas e comentários você recebe, e quantos comentários vêm por curtida. É a minha estimativa de quanto da sua audiência de fato vê e responde o que você publica.</Tip></div><div className="value">{au.score}/100</div><div className="sub">minha estimativa, não é nota do Instagram</div></div>
        </div>
        <div style={{ marginTop: 18 }}>
          <div className="row between small muted"><span>Faixa saudável de engajamento real</span><span>Esperado {e.band[0]}% a {e.band[1]}%</span></div>
          <BandBar value={e.real} band={e.band} />
          <div className="small" style={{ marginTop: 6 }}>Você está em <b>{fmtPct(e.real, 2)}</b>, {e.bandStatus === "acima" ? "acima da faixa esperada" : e.bandStatus === "abaixo" ? "abaixo da faixa esperada" : "dentro da faixa esperada"}.</div>
        </div>
        <div style={{ marginTop: 18 }}>
          <div className="row" style={{ gap: 8 }}><h3 style={{ margin: 0 }}>Ações urgentes para descongelar o perfil</h3><Tip label="Como eu escolho e ordeno estas ações">Eu comparo cada um dos três sinais da sua nota com o que ele poderia valer e listo só os que estão puxando o número para baixo. A ordem é por quanto cada um devolve para a nota, então a primeira da lista é sempre a que mais muda o resultado. Quando nenhum sinal está baixo, aqui não aparece tarefa nenhuma.</Tip></div>
          <div className="muted small" style={{ marginBottom: 8 }}>o que mais levanta a sua nota vem primeiro</div>
          {au.tips.length === 0 ? <div className="empty">Nenhum sinal está puxando a sua nota para baixo. Continue assim.</div> : au.tips.map((t: any) => (
            <div key={t.key} className="card" style={{ background: "var(--card2)", marginBottom: 10 }}>
              <div className="row"><b style={{ textTransform: "uppercase", letterSpacing: ".08em", fontSize: 13, color: "var(--pink)" }}>{t.title}</b><span className="muted small">vale até {Math.round(t.key === "alcance" ? 44 : t.key === "engajamento" ? 30 : 26)} pontos da nota</span></div>
              <p style={{ margin: "8px 0 0" }}>{t.text}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="card" style={{ marginTop: 14 }}>
        <h2>Interações por tipo de conteúdo</h2>
        <div className="muted small" style={{ marginBottom: 12 }}>curtidas, comentários, salvamentos e compartilhamentos somados por formato · sem filtro de período</div>
        <div className="grid g3">
          {m.byType.map((t: any) => (
            <div key={t.type} className="card" style={{ background: "var(--card2)" }}>
              <div className="tag">{t.label}</div>
              <div className="muted small" style={{ marginTop: 8 }}>{fmtInt(t.posts)} posts</div>
              <div style={{ fontSize: 22, fontWeight: 700, margin: "2px 0 10px" }}>{fmtCompact(t.interactions)} interações</div>
              {([["Curtidas", t.likes], ["Comentários", t.comments], ["Salvamentos", t.saves], ["Compartilhamentos", t.shares]] as [string, number][]).map(([l, v]) => <div key={l} className="row between small"><span className="muted">{l}</span><b>{fmtCompact(v)}</b></div>)}
            </div>
          ))}
        </div>
      </div>

      {m.audience && (
        <>
          <div className="card" style={{ marginTop: 14 }}>
            <h2>Quem segue você</h2>
            <div className="muted small" style={{ marginBottom: 12 }}>faixa etária e gênero · retrato da última coleta, sem filtro de período</div>
            <div className="grid g2">
              <div><div className="row between"><b className="small muted">FAIXA ETÁRIA</b><span className="muted small">{fmtCompact(m.audience.classifiedTotal)} no recorte</span></div>{m.audience.age.map((r: Row) => <StatBar key={r.label} r={r} />)}</div>
              <div><div className="row between"><b className="small muted">GÊNERO</b><span className="muted small">{fmtCompact(m.audience.classifiedTotal)} no recorte</span></div>{m.audience.gender.map((r: Row) => <StatBar key={r.label} r={r} />)}</div>
            </div>
            <p className="muted tiny" style={{ marginTop: 10 }}>A Meta classifica só parte dos seguidores (o recorte) por idade, gênero e local. Por isso esse total fica um pouco abaixo dos {fmtInt(m.profile.followers)} seguidores totais.</p>
          </div>
          <div className="card" style={{ marginTop: 14 }}>
            <h2>De onde eles são</h2>
            <div className="muted small" style={{ marginBottom: 12 }}>países e cidades · retrato da última coleta, sem filtro de período</div>
            <div className="grid g2">
              <div><b className="small muted">PAÍSES ({m.audience.countriesTotal})</b>{m.audience.countries.map((r: Row) => <StatBar key={r.label} r={r} count />)}</div>
              <div><b className="small muted">CIDADES ({m.audience.citiesTotal})</b>{m.audience.cities.map((r: Row) => <StatBar key={r.label} r={r} count />)}</div>
            </div>
          </div>
        </>
      )}

      <div className="card" style={{ marginTop: 14 }}>
        <h2>Posts que mais deram certo</h2>
        <div className="muted small" style={{ marginBottom: 10 }}>os 12 com mais {TOP.find((t) => t[0] === top)![1].toLowerCase()} · sem filtro de período</div>
        <div className="chips" role="group" aria-label="Ordenar por" style={{ marginBottom: 14 }}>{TOP.map(([k, l]) => <button key={k} className="chip" aria-pressed={top === k} onClick={() => setTop(k)}>{l}</button>)}</div>
        <div className="grid g4">
          {topList.map((p) => (
            <button key={p.id} className="post-card" onClick={() => setOpen(p)} aria-label={`Abrir post de ${fmtDate(p.publishedAt)}`}>
              <div className="thumb" style={thumbStyle(p)}>{fmtCompact(p.views)} visualizações</div>
              <div style={{ padding: 12 }}>
                <div className="muted tiny">{TYPE_LABEL[p.type]} · {fmtDate(p.publishedAt)}, {timeAgo(p.publishedAt)}</div>
                <div className="small" style={{ margin: "6px 0 8px", minHeight: 36, overflow: "hidden" }}>{(p.caption || "(sem legenda)").slice(0, 90)}</div>
                {([["alcance", p.reach], ["curtidas", p.likes], ["comentários", p.comments], ["salvamentos", p.saves], ["compartilhamentos", p.shares]] as [string, number][]).map(([l, v]) => <div key={l} className="row between tiny"><span className="muted">{l}</span><b>{fmtInt(v)}</b></div>)}
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="card" style={{ marginTop: 14 }}>
        <h2>Últimos posts</h2>
        <div className="muted small" style={{ marginBottom: 10 }}>{fmtInt(posts.length)} posts · sem filtro de período</div>
        <VirtualTable posts={posts} onOpen={setOpen} />
      </div>

      {open && (
        <Modal onClose={() => setOpen(null)} title="Post">
          <div className="grid g2">
            <div className="thumb" style={{ height: 320, borderRadius: 14, ...thumbStyle(open) }}>{TYPE_LABEL[open.type]}</div>
            <div>
              <div className="muted small">{fmtDate(open.publishedAt)} · {timeAgo(open.publishedAt)}</div>
              <p style={{ margin: "10px 0" }}>{open.caption || "(sem legenda)"}</p>
              {([["Visualizações", open.views], ["Alcance", open.reach], ["Curtidas", open.likes], ["Comentários", open.comments], ["Salvamentos", open.saves], ["Compartilhamentos", open.shares]] as [string, number][]).map(([l, v]) => <div key={l} className="row between small" style={{ padding: "4px 0", borderBottom: "1px solid var(--line)" }}><span className="muted">{l}</span><b>{fmtInt(v)}</b></div>)}
              <div style={{ marginTop: 14 }}>
                {open.permalink ? <a className="btn primary" href={open.permalink} target="_blank" rel="noreferrer">↗ Abrir no Instagram</a> : <button className="btn" disabled title="Post de demonstração">↗ Abrir no Instagram</button>}
              </div>
            </div>
          </div>
        </Modal>
      )}
      {node}
    </>
  );
}

function thumbStyle(p: Post): React.CSSProperties {
  const img = p.thumbnailUrl?.startsWith("https://") ? `linear-gradient(transparent 55%, #000b), url(${JSON.stringify(p.thumbnailUrl)}) center / cover, ` : "";
  return { background: img + gradientFor(p.id) };
}
function gradientFor(id: string) {
  const h = [...id].reduce((a, c) => a + c.charCodeAt(0), 0) % 360;
  return `linear-gradient(135deg, hsl(${h} 55% 28%), hsl(${(h + 60) % 360} 60% 36%))`;
}
function StatBar({ r, count }: { r: Row; count?: boolean }) {
  return <div className="stat-bar"><span>{r.label}</span><Bar pct={r.pct} /><span className="muted" style={{ textAlign: "right" }}>{count ? `${fmtCompact(r.count)} · ` : ""}{fmtPct(r.pct, 1)}</span></div>;
}
function BandBar({ value, band }: { value: number; band: readonly number[] }) {
  const max = Math.max(10, value * 1.15, band[1] * 2);
  const pos = (x: number) => `${Math.min(100, (x / max) * 100)}%`;
  return (
    <div style={{ position: "relative", height: 10, background: "#0b1126", border: "1px solid var(--line)", borderRadius: 99, margin: "8px 0" }} role="img" aria-label={`Engajamento real ${value}%. Faixa saudável de ${band[0]}% a ${band[1]}%.`}>
      <div style={{ position: "absolute", left: pos(band[0]), width: `calc(${pos(band[1])} - ${pos(band[0])})`, top: 0, bottom: 0, background: "var(--green)", borderRadius: 99 }} />
      <div style={{ position: "absolute", left: pos(value), top: -4, width: 4, height: 18, background: "#fff", borderRadius: 2 }} />
    </div>
  );
}

const ROW_H = 46;
function VirtualTable({ posts, onOpen }: { posts: Post[]; onOpen: (p: Post) => void }) {
  const box = useRef<HTMLDivElement>(null);
  const [top, setTop] = useState(0);
  const H = 520;
  const start = Math.max(0, Math.floor(top / ROW_H) - 6);
  const end = Math.min(posts.length, Math.ceil((top + H) / ROW_H) + 6);
  const cols = "minmax(220px,1fr) 90px 120px 100px 80px 80px 90px 100px 130px";
  const heads = ["Post", "Publicado", "Tipo", "Visualizações", "Alcance", "Curtidas", "Comentários", "Salvamentos", "Compartilhamentos"];
  const slice = useMemo(() => posts.slice(start, end), [posts, start, end]);
  return (
    <div ref={box} style={{ height: H, overflow: "auto", border: "1px solid var(--line)", borderRadius: 12 }} onScroll={(e) => setTop((e.target as HTMLElement).scrollTop)} role="table" aria-label="Últimos posts" aria-rowcount={posts.length}>
      <div style={{ minWidth: 980 }}>
        <div role="row" style={{ display: "grid", gridTemplateColumns: cols, position: "sticky", top: 0, background: "var(--card)", borderBottom: "1px solid var(--line)", zIndex: 2 }}>
          {heads.map((h, i) => <div key={h} role="columnheader" className={i > 2 ? "num" : ""} style={{ padding: "10px 8px", color: "var(--muted)", fontSize: 12, textAlign: i > 2 ? "right" : "left" }}>{h}</div>)}
        </div>
        <div style={{ height: posts.length * ROW_H, position: "relative" }}>
          {slice.map((p, i) => (
            <div key={p.id} role="row" onClick={() => onOpen(p)} style={{ position: "absolute", top: (start + i) * ROW_H, height: ROW_H, left: 0, right: 0, display: "grid", gridTemplateColumns: cols, alignItems: "center", borderBottom: "1px solid #172043", fontSize: 13, cursor: "pointer" }}>
              <div role="cell" className="cap-cell" style={{ padding: "0 8px" }}>{p.caption || <span className="dim">(sem legenda)</span>}</div>
              <div role="cell" style={{ padding: "0 8px" }}>{fmtDate(p.publishedAt)}</div>
              <div role="cell" style={{ padding: "0 8px" }}>{TYPE_LABEL[p.type]}</div>
              {[p.views, p.reach, p.likes, p.comments, p.saves, p.shares].map((v, k) => <div key={k} role="cell" style={{ padding: "0 8px", textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{fmtInt(v)}</div>)}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
