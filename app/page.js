"use client";
import { useState, useEffect, useCallback } from "react";
import { BENCHMARKS, getStatus, avgKpis } from "@/lib/kpi";
import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, ReferenceLine,
} from "recharts";

const STATUS_COLOR = { green: "#3B6D11", yellow: "#854F0B", red: "#A32D2D", gray: "#5F5E5A" };
const STATUS_BG    = { green: "#EAF3DE", yellow: "#FAEEDA", red: "#FCEBEB", gray: "#F1EFE8" };
const LEVEL_STYLE  = {
  base:     { bg: "#E6F1FB", color: "#185FA5", label: "Base" },
  avanzato: { bg: "#EEEDFE", color: "#534AB7", label: "Avanzato" },
  quantico: { bg: "#E1F5EE", color: "#0F6E56", label: "Quantico" },
};

// Coach principali vs "altri"
const COACH_PRINCIPALI = ["sabrina", "silvia", "alex", "federica"];
const COACH_ALTRI      = ["frecci", "frency", "marica", "ghiro"];
const COACH_NAMES      = [...COACH_PRINCIPALI, ...COACH_ALTRI];
const COACH_COLORS     = ["#6366f1","#f59e0b","#10b981","#3b82f6","#94a3b8"];
// indici: sabrina=0, silvia=1, alex=2, federica=3, altri=4

const HISTORY_FILE_ID = process.env.NEXT_PUBLIC_HISTORY_FILE_ID || "";

function fmtEuro(v) {
  if (v == null) return "—";
  return new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(v);
}
function fmtPct(v) { return v == null ? "—" : `${v.toFixed(1)}%`; }

function statusColor(val, min, max) {
  if (val == null) return "#888";
  if (max != null) {
    if (val >= min && val <= max) return "#3B6D11";
    if (val >= min * 0.85 && val <= max * 1.15) return "#854F0B";
    return "#A32D2D";
  }
  if (val >= min) return "#3B6D11";
  if (val >= min * 0.85) return "#854F0B";
  return "#A32D2D";
}
function statusBg(val, min, max) {
  const c = statusColor(val, min, max);
  if (c === "#3B6D11") return "#EAF3DE";
  if (c === "#854F0B") return "#FAEEDA";
  return "#FCEBEB";
}

function Badge({ level }) {
  const s = LEVEL_STYLE[level] || LEVEL_STYLE.base;
  return <span style={{ background: s.bg, color: s.color, fontSize: 11, padding: "2px 8px", borderRadius: 6, fontWeight: 500 }}>{s.label}</span>;
}
function StatusDot({ status }) {
  return <span style={{ display: "inline-block", width: 8, height: 8, borderRadius: "50%", background: STATUS_COLOR[status] || "#888", marginRight: 6, flexShrink: 0 }} />;
}
function KpiRow({ kpiKey, value }) {
  const b = BENCHMARKS[kpiKey];
  if (!b || value === null || value === undefined) return null;
  const status = getStatus(kpiKey, value);
  const benchLabel = b.invert ? `< ${b.format(b.max)}` : `${b.format(b.min)} – ${b.format(b.max)}`;
  return (
    <div style={{ display: "flex", alignItems: "center", padding: "7px 0", borderBottom: "0.5px solid var(--border)" }}>
      <span style={{ flex: 1, fontSize: 13, color: "var(--text-secondary)" }}><StatusDot status={status} />{b.label}</span>
      <span style={{ fontSize: 13, fontWeight: 500, minWidth: 70, textAlign: "right" }}>{b.format(value)}</span>
      <span style={{ fontSize: 11, color: "var(--text-tertiary)", minWidth: 90, textAlign: "right" }}>{benchLabel}</span>
    </div>
  );
}
function ScoreBar({ kpis }) {
  const keys = Object.keys(BENCHMARKS);
  const valid = keys.filter(k => kpis[k] !== null && kpis[k] !== undefined);
  const green = valid.filter(k => getStatus(k, kpis[k]) === "green").length;
  const pct = valid.length ? Math.round(green / valid.length * 100) : 0;
  const color = pct >= 70 ? "#3B6D11" : pct >= 50 ? "#854F0B" : "#A32D2D";
  return (
    <div>
      <div style={{ fontSize: 13, fontWeight: 500, color, marginBottom: 4 }}>{pct}% KPI in target</div>
      <div style={{ height: 5, background: "var(--surface)", borderRadius: 3 }}>
        <div style={{ width: `${pct}%`, height: "100%", background: color, borderRadius: 3 }} />
      </div>
    </div>
  );
}
function MetricCard({ label, value, sub, subColor }) {
  return (
    <div style={{ background: "var(--surface)", borderRadius: 8, padding: "12px 14px" }}>
      <div style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 500 }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: subColor || "var(--text-tertiary)", marginTop: 2 }}>{sub}</div>}
    </div>
  );
}
function Card({ title, children }) {
  return (
    <div style={{ background: "var(--card)", border: "0.5px solid var(--border)", borderRadius: 12, padding: "1rem 1.25rem", marginBottom: "1rem" }}>
      {title && <div style={{ fontSize: 11, fontWeight: 500, color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 12 }}>{title}</div>}
      {children}
    </div>
  );
}

function avg(arr) {
  const vals = arr.filter(v => v != null && !isNaN(v));
  return vals.length ? vals.reduce((a,b) => a+b, 0) / vals.length : null;
}

function calcMetrics(clienti) {
  if (!clienti || clienti.length === 0) return null;
  const ricaviPoltrona = clienti.flatMap(c => c.chartData.map(d => d.ricaviPoltrona).filter(v => v != null && v > 0));
  const molPercs       = clienti.flatMap(c => c.chartData.map(d => d.molPerc).filter(v => v != null));
  const crescite = clienti.map(c => {
    const anni = c.chartData.filter(d => d.ricavi != null && d.ricavi > 0);
    if (anni.length < 2) return null;
    return ((anni[anni.length-1].ricavi - anni[0].ricavi) / anni[0].ricavi) * 100;
  }).filter(v => v != null);

  return {
    nClienti:         clienti.length,
    anniMedi:         avg(clienti.map(c => c.anniCoaching || c.chartData.length)),
    ricaviPoltrMedio: avg(ricaviPoltrona),
    molPercMedio:     avg(molPercs),
    crescitaRicavi:   avg(crescite),
    topRicavi:        Math.max(0, ...clienti.map(c => c.ultimiRicavi || 0)),
  };
}

// ─── Grafici confronto ────────────────────────────────────────────────────────
function BenchmarkChart({ groups }) {
  const dataRic = groups.filter(g => g.metrics?.ricaviPoltrMedio).map(g => ({
    coach: g.label,
    ricaviPoltrona: Math.round(g.metrics.ricaviPoltrMedio),
  }));
  const dataMol = groups.filter(g => g.metrics?.molPercMedio != null).map(g => ({
    coach: g.label,
    molPerc: Math.round(g.metrics.molPercMedio * 10) / 10,
  }));

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
      <div>
        <div style={{ fontSize: 11, color: "var(--text-tertiary)", marginBottom: 8, textTransform: "uppercase", letterSpacing: ".06em" }}>Ricavi / Poltrona vs benchmark</div>
        {dataRic.length === 0 ? <div style={{ fontSize: 12, color: "var(--text-tertiary)", padding: "1rem 0" }}>Dati non disponibili</div> : (
          <ResponsiveContainer width="100%" height={Math.max(180, dataRic.length * 40)}>
            <ComposedChart data={dataRic} layout="vertical" margin={{ top: 0, right: 80, left: 70, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
              <XAxis type="number" tickFormatter={v => `${(v/1000).toFixed(0)}k`} tick={{ fontSize: 10 }} />
              <YAxis type="category" dataKey="coach" tick={{ fontSize: 12 }} width={65} />
              <Tooltip formatter={v => fmtEuro(v)} />
              <ReferenceLine x={200000} stroke="#3B6D11" strokeDasharray="4 2" label={{ value: "€200k", fontSize: 9, fill: "#3B6D11", position: "top" }} />
              <ReferenceLine x={250000} stroke="#3B6D11" strokeDasharray="4 2" label={{ value: "€250k", fontSize: 9, fill: "#3B6D11", position: "top" }} />
              <Bar dataKey="ricaviPoltrona" name="Ricavi/Poltrona" fill="#6366f1" radius={[0,4,4,0]}
                label={{ position: "right", formatter: v => fmtEuro(v), fontSize: 10, fill: "var(--text-primary)" }} />
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </div>
      <div>
        <div style={{ fontSize: 11, color: "var(--text-tertiary)", marginBottom: 8, textTransform: "uppercase", letterSpacing: ".06em" }}>MOL % medio vs benchmark</div>
        {dataMol.length === 0 ? <div style={{ fontSize: 12, color: "var(--text-tertiary)", padding: "1rem 0" }}>Dati non disponibili</div> : (
          <ResponsiveContainer width="100%" height={Math.max(180, dataMol.length * 40)}>
            <ComposedChart data={dataMol} layout="vertical" margin={{ top: 0, right: 60, left: 70, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
              <XAxis type="number" tickFormatter={v => `${v}%`} tick={{ fontSize: 10 }} />
              <YAxis type="category" dataKey="coach" tick={{ fontSize: 12 }} width={65} />
              <Tooltip formatter={v => fmtPct(v)} />
              <ReferenceLine x={15} stroke="#3B6D11" strokeDasharray="4 2" label={{ value: "15%", fontSize: 9, fill: "#3B6D11", position: "top" }} />
              <ReferenceLine x={20} stroke="#3B6D11" strokeDasharray="4 2" label={{ value: "20%", fontSize: 9, fill: "#3B6D11", position: "top" }} />
              <Bar dataKey="molPerc" name="MOL %" fill="#f59e0b" radius={[0,4,4,0]}
                label={{ position: "right", formatter: v => fmtPct(v), fontSize: 10, fill: "var(--text-primary)" }} />
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}

function TrendChart({ groups }) {
  const allYears = [...new Set(
    groups.flatMap(g => g.clienti.flatMap(c => c.chartData.map(d => d.anno)))
  )].sort();

  const data = allYears.map(anno => {
    const point = { anno };
    groups.forEach(g => {
      const vals = g.clienti.flatMap(c => {
        const d = c.chartData.find(x => x.anno === anno);
        return d?.ricavi ? [d.ricavi] : [];
      });
      point[g.label] = vals.length ? Math.round(vals.reduce((a,b)=>a+b,0)/vals.length) : null;
    });
    return point;
  });

  return (
    <ResponsiveContainer width="100%" height={280}>
      <ComposedChart data={data} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
        <XAxis dataKey="anno" tick={{ fontSize: 11 }} />
        <YAxis tickFormatter={v => `${(v/1000).toFixed(0)}k`} tick={{ fontSize: 10 }} width={48} />
        <Tooltip formatter={v => fmtEuro(v)} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        {groups.map((g, i) => (
          <Line key={g.label} dataKey={g.label} name={g.label} stroke={COACH_COLORS[i] || "#94a3b8"} strokeWidth={2} dot={{ r: 3 }} connectNulls />
        ))}
      </ComposedChart>
    </ResponsiveContainer>
  );
}

function CoachCard({ group, color, selected, onClick }) {
  const m = group.metrics;
  if (!m) return null;
  const rpColor  = m.ricaviPoltrMedio ? statusColor(m.ricaviPoltrMedio, 200000, 250000) : "#888";
  const rpBg     = m.ricaviPoltrMedio ? statusBg(m.ricaviPoltrMedio, 200000, 250000) : "var(--surface)";
  const molColor = m.molPercMedio != null ? statusColor(m.molPercMedio, 15, 20) : "#888";
  const molBg    = m.molPercMedio != null ? statusBg(m.molPercMedio, 15, 20) : "var(--surface)";
  const crescColor = m.crescitaRicavi >= 10 ? "#3B6D11" : m.crescitaRicavi >= 5 ? "#854F0B" : "#A32D2D";

  return (
    <div onClick={onClick} style={{ background: "var(--card)", border: selected ? `2px solid ${color}` : "0.5px solid var(--border)", borderRadius: 12, padding: "1rem", cursor: "pointer" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
        <div>
          <div style={{ fontWeight: 600, fontSize: 15, textTransform: "capitalize", marginBottom: 2 }}>{group.label}</div>
          <div style={{ fontSize: 12, color: "var(--text-tertiary)" }}>{m.nClienti} clienti · {m.anniMedi?.toFixed(1)} anni medi</div>
        </div>
        <div style={{ background: color + "20", color, fontSize: 11, fontWeight: 600, padding: "3px 8px", borderRadius: 6 }}>●</div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6, marginBottom: 10 }}>
        <div style={{ background: rpBg, borderRadius: 6, padding: "6px 8px", textAlign: "center" }}>
          <div style={{ fontSize: 10, color: rpColor }}>Ric./Poltr.</div>
          <div style={{ fontSize: 12, fontWeight: 600, color: rpColor }}>{m.ricaviPoltrMedio ? fmtEuro(m.ricaviPoltrMedio) : "—"}</div>
        </div>
        <div style={{ background: molBg, borderRadius: 6, padding: "6px 8px", textAlign: "center" }}>
          <div style={{ fontSize: 10, color: molColor }}>MOL %</div>
          <div style={{ fontSize: 12, fontWeight: 600, color: molColor }}>{m.molPercMedio != null ? fmtPct(m.molPercMedio) : "—"}</div>
        </div>
        <div style={{ background: "var(--surface)", borderRadius: 6, padding: "6px 8px", textAlign: "center" }}>
          <div style={{ fontSize: 10, color: "var(--text-tertiary)" }}>Crescita</div>
          <div style={{ fontSize: 12, fontWeight: 600, color: crescColor }}>{m.crescitaRicavi != null ? `+${m.crescitaRicavi.toFixed(1)}%` : "—"}</div>
        </div>
      </div>
      {m.ricaviPoltrMedio && (
        <>
          <div style={{ fontSize: 10, color: "var(--text-tertiary)", marginBottom: 3 }}>Ricavi/Poltrona vs €200k–€250k</div>
          <div style={{ height: 6, background: "var(--surface)", borderRadius: 3, position: "relative", marginBottom: 8 }}>
            <div style={{ position: "absolute", left: `${Math.min((200000/350000)*100,100)}%`, top: 0, bottom: 0, width: 2, background: "#3B6D11", opacity: 0.4 }} />
            <div style={{ position: "absolute", left: `${Math.min((250000/350000)*100,100)}%`, top: 0, bottom: 0, width: 2, background: "#3B6D11", opacity: 0.4 }} />
            <div style={{ width: `${Math.min((m.ricaviPoltrMedio/350000)*100,100)}%`, height: "100%", background: rpColor, borderRadius: 3 }} />
          </div>
        </>
      )}
      <div style={{ fontSize: 11, color: "var(--text-tertiary)" }}>
        Top ricavi: <span style={{ fontWeight: 500, color: "var(--text-primary)" }}>{m.topRicavi > 0 ? fmtEuro(m.topRicavi) : "—"}</span>
      </div>
    </div>
  );
}

function DrillDown({ group, color }) {
  const sorted = [...group.clienti].sort((a,b) => (b.ultimiRicavi||0) - (a.ultimiRicavi||0));
  return (
    <Card title={`${group.label} — ${sorted.length} clienti`}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(360px, 1fr))", gap: 12 }}>
        {sorted.map((cliente, idx) => {
          const ultimo = cliente.chartData?.[cliente.chartData.length-1];
          const primo  = cliente.chartData?.[0];
          const delta  = primo?.ricavi && ultimo?.ricavi ? ((ultimo.ricavi-primo.ricavi)/primo.ricavi*100).toFixed(1) : null;
          const coachLabel = cliente.coach || "";
          return (
            <div key={idx} style={{ background: "var(--surface)", borderRadius: 10, padding: "12px 14px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
                <div>
                  <div style={{ fontWeight: 500, fontSize: 13 }}>{cliente.nome}</div>
                  <div style={{ fontSize: 11, color: "var(--text-tertiary)" }}>
                    {coachLabel && <span style={{ background: color+"20", color, padding: "1px 5px", borderRadius: 3, marginRight: 4, textTransform: "capitalize" }}>{coachLabel}</span>}
                    {(cliente.anniCoaching || cliente.chartData?.length)} anni · {cliente.location}
                  </div>
                </div>
                {delta && <div style={{ fontSize: 14, fontWeight: 600, color: parseFloat(delta)>=0?"#3B6D11":"#A32D2D" }}>+{delta}%</div>}
              </div>
              <div style={{ display: "flex", gap: 6, marginBottom: 8, flexWrap: "wrap" }}>
                {[
                  { label: "Ricavi", value: fmtEuro(ultimo?.ricavi) },
                  { label: "MOL%", value: fmtPct(ultimo?.molPerc), c: ultimo?.molPerc != null ? statusColor(ultimo.molPerc,15,20) : null, bg: ultimo?.molPerc != null ? statusBg(ultimo.molPerc,15,20) : "var(--card)" },
                  { label: "Ric/Poltr", value: fmtEuro(ultimo?.ricaviPoltrona), c: ultimo?.ricaviPoltrona ? statusColor(ultimo.ricaviPoltrona,200000,250000) : null, bg: ultimo?.ricaviPoltrona ? statusBg(ultimo.ricaviPoltrona,200000,250000) : "var(--card)" },
                ].map(({ label, value, c, bg }) => (
                  <div key={label} style={{ background: bg||"var(--card)", borderRadius: 5, padding: "3px 8px" }}>
                    <span style={{ fontSize: 10, color: "var(--text-tertiary)" }}>{label} </span>
                    <span style={{ fontSize: 12, fontWeight: 500, color: c||"var(--text-primary)" }}>{value}</span>
                  </div>
                ))}
              </div>
              {cliente.chartData && cliente.chartData.length > 1 && (
                <ResponsiveContainer width="100%" height={75}>
                  <ComposedChart data={cliente.chartData} margin={{ top: 0, right: 4, left: 0, bottom: 0 }}>
                    <XAxis dataKey="anno" tick={{ fontSize: 8 }} />
                    <YAxis yAxisId="r" hide />
                    <YAxis yAxisId="m" hide domain={[0,50]} />
                    <Tooltip formatter={(v,name) => name==="MOL %" ? fmtPct(v) : fmtEuro(v)} />
                    <Bar yAxisId="r" dataKey="ricavi" name="Ricavi" fill={color} opacity={0.7} radius={[2,2,0,0]} />
                    <Line yAxisId="m" dataKey="molPerc" name="MOL %" stroke="#f59e0b" strokeWidth={1.5} dot={false} />
                    <ReferenceLine yAxisId="m" y={15} stroke="#3B6D11" strokeDasharray="3 2" strokeOpacity={0.4} />
                  </ComposedChart>
                </ResponsiveContainer>
              )}
            </div>
          );
        })}
      </div>
    </Card>
  );
}

// ─── STORICO TAB ─────────────────────────────────────────────────────────────
function StoricoView() {
  const [rawData, setRawData]           = useState([]);
  const [loading, setLoading]           = useState(true);
  const [selectedGroup, setSelectedGroup] = useState(null);

  useEffect(() => {
    if (!HISTORY_FILE_ID) { setLoading(false); return; }
    Promise.all(
      COACH_NAMES.map(coach =>
        fetch(`/api/history?fileId=${HISTORY_FILE_ID}&coach=${coach}`)
          .then(r => r.json())
          .then(d => ({ coach, clienti: (d.clienti || []).map(c => ({ ...c, coach })) }))
          .catch(() => ({ coach, clienti: [] }))
      )
    ).then(results => {
      setRawData(results.filter(r => r.clienti.length > 0));
      setLoading(false);
    });
  }, []);

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "4rem", flexDirection: "column", gap: 12 }}>
      <div style={{ width: 32, height: 32, border: "3px solid var(--border)", borderTopColor: "#6366f1", borderRadius: "50%", animation: "spin 1s linear infinite" }} />
      <div style={{ fontSize: 13, color: "var(--text-tertiary)" }}>Caricamento storico...</div>
    </div>
  );

  if (rawData.length === 0) return (
    <div style={{ fontSize: 13, color: "var(--text-tertiary)", padding: "2rem", textAlign: "center" }}>Nessun dato storico disponibile.</div>
  );

  // Costruisce gruppi: coach principali + "Altri account"
  const groups = [];
  COACH_PRINCIPALI.forEach((name, i) => {
    const found = rawData.find(r => r.coach === name);
    if (found && found.clienti.length > 0) {
      groups.push({ label: name, clienti: found.clienti, color: COACH_COLORS[i] });
    }
  });
  // Aggrega gli "altri"
  const altriClienti = rawData
    .filter(r => COACH_ALTRI.includes(r.coach))
    .flatMap(r => r.clienti);
  if (altriClienti.length > 0) {
    groups.push({ label: "altri account", clienti: altriClienti, color: COACH_COLORS[4] });
  }

  // Aggiunge metriche a ogni gruppo
  const groupsWithMetrics = groups.map(g => ({ ...g, metrics: calcMetrics(g.clienti) }));

  // Totali aggregati
  const tuttiClienti = groups.flatMap(g => g.clienti);
  const totali = calcMetrics(tuttiClienti);

  const selectedData = selectedGroup ? groupsWithMetrics.find(g => g.label === selectedGroup) : null;

  return (
    <div>
      {/* KPI aggregati */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 10, marginBottom: "1.5rem" }}>
        <MetricCard label="Clienti totali" value={totali?.nClienti || 0} sub={`${groups.length} gruppi`} />
        <MetricCard label="Ric./Poltrona medio" value={totali?.ricaviPoltrMedio ? fmtEuro(totali.ricaviPoltrMedio) : "—"} sub="bench: €200k–€250k" subColor={totali?.ricaviPoltrMedio ? statusColor(totali.ricaviPoltrMedio,200000,250000) : undefined} />
        <MetricCard label="MOL % medio" value={totali?.molPercMedio != null ? fmtPct(totali.molPercMedio) : "—"} sub="bench: 15–20%" subColor={totali?.molPercMedio != null ? statusColor(totali.molPercMedio,15,20) : undefined} />
        <MetricCard label="Crescita ricavi media" value={totali?.crescitaRicavi != null ? `+${totali.crescitaRicavi.toFixed(1)}%` : "—"} sub="dall'anno zero ad oggi" subColor={totali?.crescitaRicavi >= 10 ? "#3B6D11" : "#854F0B"} />
        <MetricCard label="Anni coaching medi" value={totali?.anniMedi ? totali.anniMedi.toFixed(1) : "—"} sub="anni" />
      </div>

      <Card title="Confronto gruppi vs benchmark">
        <BenchmarkChart groups={groupsWithMetrics} />
      </Card>

      <Card title="Trend ricavi medi per anno">
        <TrendChart groups={groupsWithMetrics} />
      </Card>

      <div style={{ fontSize: 11, fontWeight: 500, color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 12 }}>
        Performance per gruppo — clicca per vedere i clienti
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 12, marginBottom: "1.5rem" }}>
        {groupsWithMetrics.map(g => (
          <CoachCard
            key={g.label}
            group={g}
            color={g.color}
            selected={selectedGroup === g.label}
            onClick={() => setSelectedGroup(selectedGroup === g.label ? null : g.label)}
          />
        ))}
      </div>

      {selectedData && <DrillDown group={selectedData} color={selectedData.color} />}
    </div>
  );
}

// ─── DASHBOARD PRINCIPALE ────────────────────────────────────────────────────
export default function Dashboard() {
  const [data, setData]                     = useState(null);
  const [loading, setLoading]               = useState(true);
  const [error, setError]                   = useState(null);
  const [view, setView]                     = useState("aziendale");
  const [levelFilter, setLevelFilter]       = useState("all");
  const [selectedCoach, setSelectedCoach]   = useState(null);
  const [selectedClient, setSelectedClient] = useState(null);
  const [refreshing, setRefreshing]         = useState(false);

  const fetchData = useCallback(async () => {
    setRefreshing(true);
    try {
      const res = await fetch("/api/drive?t=" + Date.now());
      if (!res.ok) throw new Error("Errore nel caricamento dati");
      const json = await res.json();
      if (json.error) throw new Error(json.error);
      setData(json);
      setError(null);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", flexDirection: "column", gap: 16 }}>
      <div style={{ width: 40, height: 40, border: "3px solid var(--border)", borderTopColor: "#185FA5", borderRadius: "50%", animation: "spin 1s linear infinite" }} />
      <div style={{ color: "var(--text-secondary)", fontSize: 14 }}>Caricamento dati da Google Drive...</div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  if (error) return (
    <div style={{ padding: "2rem", maxWidth: 600, margin: "0 auto" }}>
      <div style={{ background: "#FCEBEB", border: "0.5px solid #F09595", borderRadius: 12, padding: "1rem 1.25rem", color: "#A32D2D" }}>
        <div style={{ fontWeight: 500, marginBottom: 6 }}>Errore di connessione</div>
        <div style={{ fontSize: 13 }}>{error}</div>
        <button onClick={fetchData} style={{ marginTop: 12, padding: "6px 14px", borderRadius: 8, border: "0.5px solid #A32D2D", background: "transparent", color: "#A32D2D", cursor: "pointer", fontSize: 13 }}>Riprova</button>
      </div>
    </div>
  );

  const allClients      = data.coaches.flatMap(c => c.clients.map(cl => ({ ...cl, coachName: c.name })));
  const filteredClients = levelFilter === "all" ? allClients : allClients.filter(c => c.level === levelFilter);
  const levelCounts     = { base: allClients.filter(c => c.level === "base").length, avanzato: allClients.filter(c => c.level === "avanzato").length, quantico: allClients.filter(c => c.level === "quantico").length };
  const globalAvg       = avgKpis(filteredClients.map(c => c.kpis));
  const globalKeys      = Object.keys(BENCHMARKS);
  const globalGreen     = globalKeys.filter(k => globalAvg[k] !== null && getStatus(k, globalAvg[k]) === "green").length;
  const globalPct       = globalKeys.length ? Math.round(globalGreen / globalKeys.length * 100) : 0;

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", color: "var(--text-primary)", fontFamily: "system-ui, sans-serif" }}>
      <style>{`
        :root { --bg: #F7F6F3; --card: #fff; --surface: #EEECE8; --border: rgba(0,0,0,0.1); --text-primary: #1a1a18; --text-secondary: #5F5E5A; --text-tertiary: #888780; }
        @media (prefers-color-scheme: dark) { :root { --bg: #1a1a18; --card: #242422; --surface: #2c2c2a; --border: rgba(255,255,255,0.1); --text-primary: #f0ede8; --text-secondary: #B4B2A9; --text-tertiary: #888780; } }
        * { box-sizing: border-box; margin: 0; padding: 0; }
      `}</style>
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "1.5rem 1rem" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.5rem" }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 500, color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 4 }}>ASISD</div>
            <h1 style={{ fontSize: 22, fontWeight: 500 }}>DBC Dashboard</h1>
          </div>
          {view !== "storico" && (
            <button onClick={fetchData} disabled={refreshing} style={{ padding: "6px 12px", borderRadius: 8, border: "0.5px solid var(--border)", background: "transparent", color: "var(--text-secondary)", cursor: "pointer", fontSize: 12 }}>
              {refreshing ? "⟳ Aggiornamento..." : "⟳ Aggiorna"}
            </button>
          )}
        </div>

        <div style={{ display: "flex", gap: 6, marginBottom: "1.5rem", borderBottom: "0.5px solid var(--border)", paddingBottom: "1rem" }}>
          {[["aziendale","🏢","Aziendale"],["coach","👥","Per coach"],["cliente","👤","Cliente singolo"],["storico","📈","Storico"]].map(([id,icon,label]) => (
            <button key={id} onClick={() => setView(id)} style={{ padding: "6px 14px", borderRadius: 8, border: view===id?"0.5px solid var(--border)":"0.5px solid transparent", background: view===id?"var(--card)":"transparent", cursor: "pointer", fontSize: 13, color: view===id?"var(--text-primary)":"var(--text-secondary)", fontWeight: view===id?500:400 }}>
              {icon} {label}
            </button>
          ))}
        </div>

        {view === "storico" && <StoricoView />}

        {view === "aziendale" && (
          <div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: 10, marginBottom: "1.25rem" }}>
              <MetricCard label="Clienti totali" value={allClients.length} sub={`${data.coaches.length} coach attivi`} />
              <MetricCard label="Base" value={levelCounts.base} sub={allClients.length ? `${Math.round(levelCounts.base/allClients.length*100)}%` : "0%"} subColor="#185FA5" />
              <MetricCard label="Avanzati" value={levelCounts.avanzato} sub={allClients.length ? `${Math.round(levelCounts.avanzato/allClients.length*100)}%` : "0%"} subColor="#534AB7" />
              <MetricCard label="Quantici" value={levelCounts.quantico} sub={allClients.length ? `${Math.round(levelCounts.quantico/allClients.length*100)}%` : "0%"} subColor="#0F6E56" />
              <MetricCard label="Target globale" value={`${globalPct}%`} sub="KPI in benchmark" subColor={globalPct>=70?"#3B6D11":globalPct>=50?"#854F0B":"#A32D2D"} />
            </div>
            <div style={{ display: "flex", gap: 6, marginBottom: "1rem", flexWrap: "wrap" }}>
              {[["all","Tutti","#5F5E5A"],["base","Base","#185FA5"],["avanzato","Avanzati","#534AB7"],["quantico","Quantici","#0F6E56"]].map(([val,label,color]) => (
                <button key={val} onClick={() => setLevelFilter(val)} style={{ padding: "4px 12px", borderRadius: 20, fontSize: 12, cursor: "pointer", border: "0.5px solid", borderColor: levelFilter===val?color:"var(--border)", background: levelFilter===val?color+"20":"transparent", color: levelFilter===val?color:"var(--text-secondary)", fontWeight: levelFilter===val?500:400 }}>
                  {label}
                </button>
              ))}
            </div>
            <div style={{ display: "flex", gap: 8, fontSize: 12, color: "var(--text-secondary)", marginBottom: "1rem" }}>
              {[["green","In target"],["yellow","Attenzione"],["red","Sotto benchmark"]].map(([s,l]) => (
                <span key={s} style={{ display: "flex", alignItems: "center", gap: 4 }}><StatusDot status={s} />{l}</span>
              ))}
            </div>
            <Card title={`KPI medi — ${levelFilter==="all"?"tutti i livelli":levelFilter}`}>
              {Object.keys(BENCHMARKS).map(k => <KpiRow key={k} kpiKey={k} value={globalAvg[k]} />)}
              {Object.values(globalAvg).every(v => v===null) && <div style={{ fontSize: 13, color: "var(--text-tertiary)", padding: "1rem 0", textAlign: "center" }}>Nessun dato disponibile.</div>}
            </Card>
          </div>
        )}

        {view === "coach" && (
          <div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 10, marginBottom: "1.25rem" }}>
              {data.coaches.map(coach => {
                const avg2 = avgKpis(coach.clients.map(c => c.kpis));
                return (
                  <div key={coach.id} onClick={() => setSelectedCoach(selectedCoach?.id===coach.id?null:coach)} style={{ background: "var(--card)", border: selectedCoach?.id===coach.id?"2px solid #185FA5":"0.5px solid var(--border)", borderRadius: 12, padding: "1rem", cursor: "pointer" }}>
                    <div style={{ fontWeight: 500, fontSize: 14, marginBottom: 4 }}>👤 {coach.name}</div>
                    <div style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 10 }}>{coach.clients.length} clienti</div>
                    <ScoreBar kpis={avg2} />
                  </div>
                );
              })}
            </div>
            {selectedCoach && (
              <>
                <Card title={`KPI medi — ${selectedCoach.name}`}>
                  {Object.keys(BENCHMARKS).map(k => <KpiRow key={k} kpiKey={k} value={avgKpis(selectedCoach.clients.map(c=>c.kpis))[k]} />)}
                </Card>
                <Card title={`Clienti di ${selectedCoach.name}`}>
                  {selectedCoach.clients.map(client => {
                    const keys = Object.keys(BENCHMARKS);
                    const valid = keys.filter(k => client.kpis[k]!==null && client.kpis[k]!==undefined);
                    const green = valid.filter(k => getStatus(k,client.kpis[k])==="green").length;
                    const pct = valid.length ? Math.round(green/valid.length*100) : 0;
                    const color = pct>=70?"#3B6D11":pct>=50?"#854F0B":"#A32D2D";
                    return (
                      <div key={client.id} onClick={() => { setSelectedClient({...client,coachName:selectedCoach.name}); setView("cliente"); }} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: "0.5px solid var(--border)", cursor: "pointer" }}>
                        <span style={{ flex: 1, fontSize: 13, fontWeight: 500 }}>{client.name}</span>
                        <Badge level={client.level} />
                        <span style={{ fontSize: 12, color, minWidth: 70, textAlign: "right" }}>{pct}% target</span>
                        <span style={{ color: "var(--text-tertiary)" }}>›</span>
                      </div>
                    );
                  })}
                </Card>
              </>
            )}
          </div>
        )}

        {view === "cliente" && (
          <div>
            <div style={{ marginBottom: "1rem" }}>
              <select onChange={e => { const cl = allClients.find(c=>c.id===e.target.value); setSelectedClient(cl?{...cl,coachName:data.coaches.find(co=>co.clients.some(c=>c.id===cl.id))?.name}:null); }} value={selectedClient?.id||""} style={{ padding: "6px 10px", borderRadius: 8, border: "0.5px solid var(--border)", background: "var(--surface)", color: "var(--text-primary)", fontSize: 13 }}>
                <option value="">— Seleziona un cliente —</option>
                {data.coaches.map(coach => (
                  <optgroup key={coach.id} label={coach.name}>
                    {coach.clients.map(cl => <option key={cl.id} value={cl.id}>{cl.name} ({LEVEL_STYLE[cl.level]?.label})</option>)}
                  </optgroup>
                ))}
              </select>
            </div>
            {selectedClient && (
              <Card>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
                  <div style={{ width: 42, height: 42, borderRadius: "50%", background: "#E6F1FB", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 500, fontSize: 14, color: "#185FA5", flexShrink: 0 }}>
                    {selectedClient.name.split(" ").map(w=>w[0]).join("").slice(0,2).toUpperCase()}
                  </div>
                  <div>
                    <div style={{ fontWeight: 500, fontSize: 15 }}>{selectedClient.name}</div>
                    <div style={{ fontSize: 12, color: "var(--text-secondary)", display: "flex", gap: 8, alignItems: "center", marginTop: 2 }}>
                      <span>Coach: {selectedClient.coachName}</span>
                      <Badge level={selectedClient.level} />
                    </div>
                  </div>
                </div>
                {Object.keys(BENCHMARKS).map(k => {
                  const val = selectedClient.kpis[k];
                  if (val===null||val===undefined) return null;
                  const b = BENCHMARKS[k];
                  const status = getStatus(k,val);
                  return (
                    <div key={k} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: "0.5px solid var(--border)" }}>
                      <span style={{ flex: 1, fontSize: 13, color: "var(--text-secondary)" }}>{b.label}</span>
                      <span style={{ fontSize: 13, fontWeight: 500, background: STATUS_BG[status], color: STATUS_COLOR[status], padding: "2px 8px", borderRadius: 6 }}>{b.format(val)}</span>
                      <span style={{ fontSize: 11, color: "var(--text-tertiary)", minWidth: 90, textAlign: "right" }}>{b.invert?`< ${b.format(b.max)}`:`${b.format(b.min)} – ${b.format(b.max)}`}</span>
                    </div>
                  );
                })}
              </Card>
            )}
          </div>
        )}

        {view !== "storico" && (
          <div style={{ fontSize: 11, color: "var(--text-tertiary)", textAlign: "center", marginTop: "2rem" }}>
            {data.updatedAt && `Dati caricati: ${new Date(data.updatedAt).toLocaleString("it")}`}
          </div>
        )}
      </div>
    </div>
  );
}
