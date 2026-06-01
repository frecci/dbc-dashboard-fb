"use client";
import { useState, useEffect, useCallback } from "react";
import { BENCHMARKS, getStatus, avgKpis } from "@/lib/kpi";
import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, LineChart
} from "recharts";

const STATUS_COLOR = { green: "#3B6D11", yellow: "#854F0B", red: "#A32D2D", gray: "#5F5E5A" };
const STATUS_BG = { green: "#EAF3DE", yellow: "#FAEEDA", red: "#FCEBEB", gray: "#F1EFE8" };
const LEVEL_STYLE = {
  base: { bg: "#E6F1FB", color: "#185FA5", label: "Base" },
  avanzato: { bg: "#EEEDFE", color: "#534AB7", label: "Avanzato" },
  quantico: { bg: "#E1F5EE", color: "#0F6E56", label: "Quantico" },
};

const COACH_COLORS = ["#6366f1","#f59e0b","#10b981","#ef4444","#3b82f6","#8b5cf6","#f97316","#06b6d4"];

const HISTORY_FILE_ID = process.env.NEXT_PUBLIC_HISTORY_FILE_ID || "";
const COACH_NAMES = ["sabrina","silvia","alex","federica","frecci","frency","marica","ghiro"];

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

function fmtEuro(v) {
  if (v == null) return "—";
  return new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(v);
}

function HistoryChart({ clienteName, coachName }) {
  const [history, setHistory] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!clienteName || !coachName) return;
    setLoading(true);
    fetch(`/api/history?fileId=${HISTORY_FILE_ID}&coach=${encodeURIComponent(coachName)}&cliente=${encodeURIComponent(clienteName)}`)
      .then(r => r.json())
      .then(d => setHistory(d.chartData || null))
      .catch(() => setHistory(null))
      .finally(() => setLoading(false));
  }, [clienteName, coachName]);

  if (loading) return <div style={{ fontSize: 13, color: "var(--text-tertiary)", padding: "1rem 0" }}>Caricamento storico...</div>;
  if (!history || history.length === 0) return <div style={{ fontSize: 13, color: "var(--text-tertiary)", padding: "1rem 0" }}>Nessun dato storico disponibile.</div>;

  const primo = history[0];
  const ultimo = history[history.length - 1];
  const deltaRic = primo?.ricavi && ultimo?.ricavi ? ((ultimo.ricavi - primo.ricavi) / primo.ricavi * 100).toFixed(1) : null;

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <div style={{ fontSize: 13, color: "var(--text-secondary)" }}>{history.length} anni · {primo.anno} → {ultimo.anno}</div>
        {deltaRic && <div style={{ fontSize: 18, fontWeight: 600, color: parseFloat(deltaRic) >= 0 ? "#3B6D11" : "#A32D2D" }}>+{deltaRic}% ricavi</div>}
      </div>
      <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
        {[{ label: "Ricavi ultimo anno", value: fmtEuro(ultimo.ricavi) }, { label: "MOL %", value: ultimo.molPerc != null ? `${ultimo.molPerc.toFixed(1)}%` : "—" }, { label: "Poltrone", value: ultimo.poltrone ?? "—" }, { label: "Ric./Poltrona", value: fmtEuro(ultimo.ricaviPoltrona) }].map(({ label, value }) => (
          <div key={label} style={{ background: "var(--surface)", borderRadius: 8, padding: "8px 12px", minWidth: 110 }}>
            <div style={{ fontSize: 11, color: "var(--text-tertiary)" }}>{label}</div>
            <div style={{ fontSize: 14, fontWeight: 500, marginTop: 2 }}>{value}</div>
          </div>
        ))}
      </div>
      <ResponsiveContainer width="100%" height={220}>
        <ComposedChart data={history} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
          <XAxis dataKey="anno" tick={{ fontSize: 11 }} />
          <YAxis yAxisId="r" tickFormatter={v => `${(v/1000).toFixed(0)}k`} tick={{ fontSize: 10 }} width={44} />
          <YAxis yAxisId="m" orientation="right" tickFormatter={v => `${v}%`} tick={{ fontSize: 10 }} width={36} domain={[0, 50]} />
          <Tooltip formatter={(v, name) => name === "MOL %" ? `${v?.toFixed(1)}%` : fmtEuro(v)} />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Bar yAxisId="r" dataKey="ricavi" name="Ricavi €" fill="#6366f1" opacity={0.85} radius={[4,4,0,0]} />
          <Line yAxisId="m" dataKey="molPerc" name="MOL %" stroke="#f59e0b" strokeWidth={2} dot={{ r: 4 }} />
        </ComposedChart>
      </ResponsiveContainer>
      <div style={{ fontSize: 11, color: "var(--text-tertiary)", marginTop: 6 }}>Benchmark MOL: <span style={{ color: "#854F0B", fontWeight: 500 }}>15–20%</span></div>
    </div>
  );
}

// ─── STORICO TAB ─────────────────────────────────────────────────────────────
function StoricoView() {
  const [allHistory, setAllHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [coachFilter, setCoachFilter] = useState("tutti");
  const [sortBy, setSortBy] = useState("ricavi"); // ricavi | crescita | mol

  useEffect(() => {
    if (!HISTORY_FILE_ID) { setLoading(false); return; }
    // Carica tutti i coach in parallelo
    Promise.all(
      COACH_NAMES.map(coach =>
        fetch(`/api/history?fileId=${HISTORY_FILE_ID}&coach=${coach}`)
          .then(r => r.json())
          .then(d => (d.clienti || []).map(c => ({ ...c, coach })))
          .catch(() => [])
      )
    ).then(results => {
      setAllHistory(results.flat());
      setLoading(false);
    });
  }, []);

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "4rem", flexDirection: "column", gap: 12 }}>
      <div style={{ width: 32, height: 32, border: "3px solid var(--border)", borderTopColor: "#6366f1", borderRadius: "50%", animation: "spin 1s linear infinite" }} />
      <div style={{ fontSize: 13, color: "var(--text-tertiary)" }}>Caricamento storico tutti i coach...</div>
    </div>
  );

  if (allHistory.length === 0) return (
    <div style={{ fontSize: 13, color: "var(--text-tertiary)", padding: "2rem", textAlign: "center" }}>
      Nessun dato storico disponibile. Verifica che NEXT_PUBLIC_HISTORY_FILE_ID sia configurato.
    </div>
  );

  const coaches = ["tutti", ...Array.from(new Set(allHistory.map(c => c.coach)))];
  const filtered = coachFilter === "tutti" ? allHistory : allHistory.filter(c => c.coach === coachFilter);

  const sorted = [...filtered].sort((a, b) => {
    const au = a.chartData?.[a.chartData.length - 1];
    const bu = b.chartData?.[b.chartData.length - 1];
    if (sortBy === "ricavi") return (bu?.ricavi || 0) - (au?.ricavi || 0);
    if (sortBy === "mol") return (bu?.molPerc || 0) - (au?.molPerc || 0);
    if (sortBy === "crescita") {
      const ap = a.chartData?.[0]; const ag = au?.ricavi && ap?.ricavi ? (au.ricavi - ap.ricavi) / ap.ricavi : 0;
      const bp = b.chartData?.[0]; const bg = bu?.ricavi && bp?.ricavi ? (bu.ricavi - bp.ricavi) / bp.ricavi : 0;
      return bg - ag;
    }
    return 0;
  });

  // Grafico confronto ricavi ultimo anno
  const confrontoData = sorted.slice(0, 15).map(c => ({
    nome: c.nome.replace("Studio ", "").slice(0, 18),
    ricavi: c.chartData?.[c.chartData.length - 1]?.ricavi || 0,
    coach: c.coach,
  }));

  return (
    <div>
      {/* Filtri */}
      <div style={{ display: "flex", gap: 8, marginBottom: "1.25rem", flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {coaches.map((c, i) => (
            <button key={c} onClick={() => setCoachFilter(c)} style={{ padding: "4px 12px", borderRadius: 20, fontSize: 12, cursor: "pointer", border: "0.5px solid", borderColor: coachFilter===c ? COACH_COLORS[i-1] || "#6366f1" : "var(--border)", background: coachFilter===c ? (COACH_COLORS[i-1] || "#6366f1") + "20" : "transparent", color: coachFilter===c ? COACH_COLORS[i-1] || "#6366f1" : "var(--text-secondary)", fontWeight: coachFilter===c ? 500 : 400, textTransform: "capitalize" }}>
              {c}
            </button>
          ))}
        </div>
        <div style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
          {[["ricavi","Ricavi"],["crescita","Crescita %"],["mol","MOL %"]].map(([val, label]) => (
            <button key={val} onClick={() => setSortBy(val)} style={{ padding: "4px 10px", borderRadius: 6, fontSize: 11, cursor: "pointer", border: "0.5px solid var(--border)", background: sortBy===val ? "var(--surface)" : "transparent", color: sortBy===val ? "var(--text-primary)" : "var(--text-tertiary)" }}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Stats rapide */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: 10, marginBottom: "1.25rem" }}>
        <MetricCard label="Clienti totali" value={filtered.length} sub={`${coaches.length - 1} coach`} />
        <MetricCard label="Ricavi medi ultimi" value={fmtEuro(filtered.reduce((s,c) => s + (c.ultimiRicavi||0), 0) / (filtered.length||1))} />
        <MetricCard label="Media anni coaching" value={`${(filtered.reduce((s,c) => s + (c.anniCoaching||0), 0) / (filtered.length||1)).toFixed(1)}`} sub="anni" />
        <MetricCard label="Top ricavi" value={fmtEuro(Math.max(...filtered.map(c => c.ultimiRicavi||0)))} />
      </div>

      {/* Grafico confronto top 15 */}
      <Card title={`Confronto ricavi ultimo anno — top ${Math.min(15, sorted.length)} clienti`}>
        <ResponsiveContainer width="100%" height={260}>
          <ComposedChart data={confrontoData} margin={{ top: 4, right: 8, left: 0, bottom: 60 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
            <XAxis dataKey="nome" tick={{ fontSize: 10 }} angle={-35} textAnchor="end" interval={0} />
            <YAxis tickFormatter={v => `${(v/1000).toFixed(0)}k`} tick={{ fontSize: 10 }} width={44} />
            <Tooltip formatter={v => fmtEuro(v)} />
            <Bar dataKey="ricavi" name="Ricavi €" fill="#6366f1" opacity={0.85} radius={[4,4,0,0]} />
          </ComposedChart>
        </ResponsiveContainer>
      </Card>

      {/* Cards clienti */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(420px, 1fr))", gap: 16 }}>
        {sorted.map((cliente, idx) => {
          const ultimo = cliente.chartData?.[cliente.chartData.length - 1];
          const primo = cliente.chartData?.[0];
          const deltaRic = primo?.ricavi && ultimo?.ricavi ? ((ultimo.ricavi - primo.ricavi) / primo.ricavi * 100).toFixed(1) : null;
          const coachIdx = COACH_NAMES.indexOf(cliente.coach);
          const coachColor = COACH_COLORS[coachIdx] || "#6366f1";

          return (
            <div key={idx} style={{ background: "var(--card)", border: "0.5px solid var(--border)", borderRadius: 12, padding: "1rem 1.25rem" }}>
              {/* Header card */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                <div>
                  <div style={{ fontWeight: 500, fontSize: 14 }}>{cliente.nome}</div>
                  <div style={{ fontSize: 12, color: "var(--text-tertiary)", marginTop: 2 }}>
                    <span style={{ background: coachColor + "20", color: coachColor, padding: "1px 7px", borderRadius: 4, fontWeight: 500, textTransform: "capitalize" }}>{cliente.coach}</span>
                    <span style={{ marginLeft: 6 }}>{cliente.anniCoaching} anni</span>
                    {cliente.location && <span style={{ marginLeft: 6 }}>· {cliente.location}</span>}
                  </div>
                </div>
                {deltaRic && (
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 18, fontWeight: 600, color: parseFloat(deltaRic) >= 0 ? "#3B6D11" : "#A32D2D" }}>+{deltaRic}%</div>
                    <div style={{ fontSize: 10, color: "var(--text-tertiary)" }}>crescita ricavi</div>
                  </div>
                )}
              </div>

              {/* Mini KPI pills */}
              <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
                {[
                  { label: "Ricavi", value: fmtEuro(ultimo?.ricavi) },
                  { label: "MOL %", value: ultimo?.molPerc != null ? `${ultimo.molPerc.toFixed(1)}%` : "—" },
                  { label: "Ric./Poltr.", value: fmtEuro(ultimo?.ricaviPoltrona) },
                ].map(({ label, value }) => (
                  <div key={label} style={{ background: "var(--surface)", borderRadius: 6, padding: "4px 10px" }}>
                    <span style={{ fontSize: 10, color: "var(--text-tertiary)" }}>{label} </span>
                    <span style={{ fontSize: 12, fontWeight: 500 }}>{value}</span>
                  </div>
                ))}
              </div>

              {/* Mini grafico */}
              {cliente.chartData && cliente.chartData.length > 1 && (
                <ResponsiveContainer width="100%" height={120}>
                  <ComposedChart data={cliente.chartData} margin={{ top: 0, right: 8, left: 0, bottom: 0 }}>
                    <XAxis dataKey="anno" tick={{ fontSize: 9 }} />
                    <YAxis yAxisId="r" hide />
                    <YAxis yAxisId="m" hide domain={[0, 50]} />
                    <Tooltip formatter={(v, name) => name === "MOL %" ? `${v?.toFixed(1)}%` : fmtEuro(v)} />
                    <Bar yAxisId="r" dataKey="ricavi" name="Ricavi €" fill={coachColor} opacity={0.7} radius={[3,3,0,0]} />
                    <Line yAxisId="m" dataKey="molPerc" name="MOL %" stroke="#f59e0b" strokeWidth={1.5} dot={false} />
                  </ComposedChart>
                </ResponsiveContainer>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── DASHBOARD PRINCIPALE ────────────────────────────────────────────────────
export default function Dashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [view, setView] = useState("aziendale");
  const [levelFilter, setLevelFilter] = useState("all");
  const [selectedCoach, setSelectedCoach] = useState(null);
  const [selectedClient, setSelectedClient] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

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

  const allClients = data.coaches.flatMap(c => c.clients.map(cl => ({ ...cl, coachName: c.name })));
  const filteredClients = levelFilter === "all" ? allClients : allClients.filter(c => c.level === levelFilter);
  const levelCounts = { base: allClients.filter(c => c.level === "base").length, avanzato: allClients.filter(c => c.level === "avanzato").length, quantico: allClients.filter(c => c.level === "quantico").length };
  const globalAvg = avgKpis(filteredClients.map(c => c.kpis));
  const globalKeys = Object.keys(BENCHMARKS);
  const globalGreen = globalKeys.filter(k => globalAvg[k] !== null && getStatus(k, globalAvg[k]) === "green").length;
  const globalPct = globalKeys.length ? Math.round(globalGreen / globalKeys.length * 100) : 0;

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
                const avg = avgKpis(coach.clients.map(c => c.kpis));
                return (
                  <div key={coach.id} onClick={() => setSelectedCoach(selectedCoach?.id===coach.id?null:coach)} style={{ background: "var(--card)", border: selectedCoach?.id===coach.id?"2px solid #185FA5":"0.5px solid var(--border)", borderRadius: 12, padding: "1rem", cursor: "pointer" }}>
                    <div style={{ fontWeight: 500, fontSize: 14, marginBottom: 4 }}>👤 {coach.name}</div>
                    <div style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 10 }}>{coach.clients.length} clienti · {coach.clients.filter(c=>c.level==="base").length}B · {coach.clients.filter(c=>c.level==="avanzato").length}A · {coach.clients.filter(c=>c.level==="quantico").length}Q</div>
                    <ScoreBar kpis={avg} />
                  </div>
                );
              })}
              {data.coaches.length === 0 && <div style={{ fontSize: 13, color: "var(--text-tertiary)" }}>Nessun coach trovato.</div>}
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
              <select onChange={e => { const cl = allClients.find(c=>c.id===e.target.value); setSelectedClient(cl?{...cl,coachName:data.coaches.find(co=>co.clients.some(c=>c.id===cl.id))?.name}:null); }} value={selectedClient?.id||""} style={{ padding: "6px 10px", borderRadius: 8, border: "0.5px solid var(--border)", background: "var(--surface)", color: "var(--text-primary)", fontSize: 13, cursor: "pointer" }}>
                <option value="">— Seleziona un cliente —</option>
                {data.coaches.map(coach => (
                  <optgroup key={coach.id} label={coach.name}>
                    {coach.clients.map(cl => <option key={cl.id} value={cl.id}>{cl.name} ({LEVEL_STYLE[cl.level]?.label})</option>)}
                  </optgroup>
                ))}
              </select>
            </div>
            {selectedClient && (
              <>
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
                        {selectedClient.lastUpdate && <span>Aggiornato: {new Date(selectedClient.lastUpdate).toLocaleDateString("it")}</span>}
                      </div>
                    </div>
                  </div>
                  <div style={{ fontSize: 11, fontWeight: 500, color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 12 }}>KPI vs benchmark</div>
                  {Object.keys(BENCHMARKS).map(k => {
                    const val = selectedClient.kpis[k];
                    if (val===null||val===undefined) return null;
                    const b = BENCHMARKS[k];
                    const status = getStatus(k,val);
                    const color = STATUS_COLOR[status];
                    const bg = STATUS_BG[status];
                    const benchLabel = b.invert?`< ${b.format(b.max)}`:`${b.format(b.min)} – ${b.format(b.max)}`;
                    return (
                      <div key={k} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: "0.5px solid var(--border)" }}>
                        <span style={{ flex: 1, fontSize: 13, color: "var(--text-secondary)" }}>{b.label}</span>
                        <span style={{ fontSize: 13, fontWeight: 500, background: bg, color, padding: "2px 8px", borderRadius: 6 }}>{b.format(val)}</span>
                        <span style={{ fontSize: 11, color: "var(--text-tertiary)", minWidth: 90, textAlign: "right" }}>{benchLabel}</span>
                      </div>
                    );
                  })}
                  {Object.values(selectedClient.kpis).every(v=>v===null||v===undefined) && <div style={{ fontSize: 13, color: "var(--text-tertiary)", padding: "1rem 0", textAlign: "center" }}>Nessun dato disponibile per questo cliente.</div>}
                </Card>
                <Card title="Storico pluriennale">
                  <HistoryChart clienteName={selectedClient.name} coachName={selectedClient.coachName} />
                </Card>
              </>
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
