"use client";
import { useState, useEffect } from "react";
import { BENCHMARKS, getStatus, avgKpis } from "@/lib/kpi";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";

const STATUS_COLOR = { green: "#3B6D11", yellow: "#854F0B", red: "#A32D2D", gray: "#5F5E5A" };
const STATUS_BG = { green: "#EAF3DE", yellow: "#FAEEDA", red: "#FCEBEB", gray: "#F1EFE8" };
const LEVEL_STYLE = {
  base: { bg: "#E6F1FB", color: "#185FA5", label: "Base" },
  avanzato: { bg: "#EEEDFE", color: "#534AB7", label: "Avanzato" },
  quantico: { bg: "#E1F5EE", color: "#0F6E56", label: "Quantico" },
};

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
      <span style={{ flex: 1, fontSize: 13, color: "var(--text-secondary)" }}>
        <StatusDot status={status} />{b.label}
      </span>
      <span style={{ fontSize: 13, fontWeight: 500, minWidth: 70, textAlign: "right" }}>{b.format(value)}</span>
      <span style={{ fontSize: 11, color: "var(--text-tertiary)", minWidth: 90, textAlign: "right" }}>{benchLabel}</span>
    </div>
  );
}

function ScoreBar({ kpis }) {
  const keys = Object.keys(BENCHMARKS);
  const green = keys.filter(k => kpis[k] !== null && kpis[k] !== undefined && getStatus(k, kpis[k]) === "green").length;
  const total = keys.filter(k => kpis[k] !== null && kpis[k] !== undefined).length || 1;
  const pct = Math.round(green / total * 100);
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

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [view, setView] = useState("aziendale");
  const [levelFilter, setLevelFilter] = useState("all");
  const [selectedCoach, setSelectedCoach] = useState(null);
  const [selectedClient, setSelectedClient] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true);
    try {
      const res = await fetch("/api/drive");
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
  };

  useEffect(() => { fetchData(); }, []);

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
        <button onClick={() => fetchData(true)} style={{ marginTop: 12, padding: "6px 14px", borderRadius: 8, border: "0.5px solid #A32D2D", background: "transparent", color: "#A32D2D", cursor: "pointer", fontSize: 13 }}>Riprova</button>
      </div>
    </div>
  );

  const allClients = data.coaches.flatMap(c => c.clients.map(cl => ({ ...cl, coachName: c.name })));
  const filteredClients = levelFilter === "all" ? allClients : allClients.filter(c => c.level === levelFilter);

  const levelCounts = {
    base: allClients.filter(c => c.level === "base").length,
    avanzato: allClients.filter(c => c.level === "avanzato").length,
    quantico: allClients.filter(c => c.level === "quantico").length,
  };

  const globalAvg = avgKpis(filteredClients.map(c => c.kpis));
  const globalKeys = Object.keys(BENCHMARKS);
  const globalGreen = globalKeys.filter(k => globalAvg[k] !== null && getStatus(k, globalAvg[k]) === "green").length;
  const globalPct = Math.round(globalGreen / globalKeys.length * 100);

  const navItems = [
    { id: "aziendale", label: "Aziendale", icon: "🏢" },
    { id: "coach", label: "Per coach", icon: "👥" },
    { id: "cliente", label: "Cliente singolo", icon: "👤" },
  ];

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", color: "var(--text-primary)", fontFamily: "'DM Sans', system-ui, sans-serif" }}>
      <style>{`
        :root { --bg: #F7F6F3; --card: #fff; --surface: #EEECE8; --border: rgba(0,0,0,0.1); --text-primary: #1a1a18; --text-secondary: #5F5E5A; --text-tertiary: #888780; }
        @media (prefers-color-scheme: dark) { :root { --bg: #1a1a18; --card: #242422; --surface: #2c2c2a; --border: rgba(255,255,255,0.1); --text-primary: #f0ede8; --text-secondary: #B4B2A9; --text-tertiary: #888780; } }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500&display=swap');
      `}</style>

      <div style={{ maxWidth: 900, margin: "0 auto", padding: "1.5rem 1rem" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.5rem" }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 500, color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 4 }}>ASISD</div>
            <h1 style={{ fontSize: 22, fontWeight: 500 }}>DBC Dashboard</h1>
          </div>
          <button onClick={() => fetchData(true)} style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 12px", borderRadius: 8, border: "0.5px solid var(--border)", background: "transparent", color: "var(--text-secondary)", cursor: "pointer", fontSize: 12 }}>
            {refreshing ? "⟳ Aggiornamento..." : "⟳ Aggiorna"}
          </button>
        </div>

        <div style={{ display: "flex", gap: 6, marginBottom: "1.5rem", borderBottom: "0.5px solid var(--border)", paddingBottom: "1rem" }}>
          {navItems.map(item => (
            <button key={item.id} onClick={() => setView(item.id)} style={{ padding: "6px 14px", borderRadius: 8, border: view === item.id ? "0.5px solid var(--border)" : "0.5px solid transparent", background: view === item.id ? "var(--card)" : "transparent", cursor: "pointer", fontSize: 13, color: view === item.id ? "var(--text-primary)" : "var(--text-secondary)", fontWeight: view === item.id ? 500 : 400 }}>
              {item.icon} {item.label}
            </button>
          ))}
        </div>

        {view === "aziendale" && (
          <div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: 10, marginBottom: "1.25rem" }}>
              <MetricCard label="Clienti totali" value={allClients.length} sub={`${data.coaches.length} coach attivi`} />
              <MetricCard label="Base" value={levelCounts.base} sub={`${Math.round(levelCounts.base / allClients.length * 100)}%`} subColor="#185FA5" />
              <MetricCard label="Avanzati" value={levelCounts.avanzato} sub={`${Math.round(levelCounts.avanzato / allClients.length * 100)}%`} subColor="#534AB7" />
              <MetricCard label="Quantici" value={levelCounts.quantico} sub={`${Math.round(levelCounts.quantico / allClients.length * 100)}%`} subColor="#0F6E56" />
              <MetricCard label="Target globale" value={`${globalPct}%`} sub="KPI in benchmark" subColor={globalPct >= 70 ? "#3B6D11" : globalPct >= 50 ? "#854F0B" : "#A32D2D"} />
            </div>

            <div style={{ display: "flex", gap: 6, marginBottom: "1rem", flexWrap: "wrap" }}>
              {[["all", "Tutti", "#5F5E5A"], ["base", "Base", "#185FA5"], ["avanzato", "Avanzati", "#534AB7"], ["quantico", "Quantici", "#0F6E56"]].map(([val, label, color]) => (
                <button key={val} onClick={() => setLevelFilter(val)} style={{ padding: "4px 12px", borderRadius: 20, fontSize: 12, cursor: "pointer", border: "0.5px solid", borderColor: levelFilter === val ? color : "var(--border)", background: levelFilter === val ? color + "20" : "transparent", color: levelFilter === val ? color : "var(--text-secondary)", fontWeight: levelFilter === val ? 500 : 400 }}>
                  {label}
                </button>
              ))}
            </div>

            <div style={{ display: "flex", gap: 8, fontSize: 12, color: "var(--text-secondary)", marginBottom: "1rem" }}>
              {[["green", "In target"], ["yellow", "Attenzione"], ["red", "Sotto benchmark"]].map(([s, l]) => (
                <span key={s} style={{ display: "flex", alignItems: "center", gap: 4 }}><StatusDot status={s} />{l}</span>
              ))}
            </div>

            <Card title={`KPI medi — ${levelFilter === "all" ? "tutti i livelli" : levelFilter}`}>
              {Object.keys(BENCHMARKS).map(k => <KpiRow key={k} kpiKey={k} value={globalAvg[k]} />)}
              {Object.values(globalAvg).every(v => v === null) && (
                <div style={{ fontSize: 13, color: "var(--text-tertiary)", padding: "1rem 0", textAlign: "center" }}>
                  Nessun dato disponibile. Assicurati che i file siano nella cartella Drive corretta.
                </div>
              )}
            </Card>
          </div>
        )}

        {view === "coach" && (
          <div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 10, marginBottom: "1.25rem" }}>
              {data.coaches.map(coach => {
                const avg = avgKpis(coach.clients.map(c => c.kpis));
                return (
                  <div key={coach.id} onClick={() => setSelectedCoach(selectedCoach?.id === coach.id ? null : coach)} style={{ background: "var(--card)", border: selectedCoach?.id === coach.id ? "2px solid #185FA5" : "0.5px solid var(--border)", borderRadius: 12, padding: "1rem", cursor: "pointer" }}>
                    <div style={{ fontWeight: 500, fontSize: 14, marginBottom: 4 }}>👤 {coach.name}</div>
                    <div style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 10 }}>
                      {coach.clients.length} clienti · {coach.clients.filter(c => c.level === "base").length}B · {coach.clients.filter(c => c.level === "avanzato").length}A · {coach.clients.filter(c => c.level === "quantico").length}Q
                    </div>
                    <ScoreBar kpis={avg} />
                  </div>
                );
              })}
            </div>

            {selectedCoach && (
              <>
                <Card title={`KPI medi — ${selectedCoach.name}`}>
                  {Object.keys(BENCHMARKS).map(k => <KpiRow key={k} kpiKey={k} value={avgKpis(selectedCoach.clients.map(c => c.kpis))[k]} />)}
                </Card>
                <Card title={`Clienti di ${selectedCoach.name}`}>
                  {selectedCoach.clients.map(client => {
                    const keys = Object.keys(BENCHMARKS);
                    const green = keys.filter(k => client.kpis[k] !== null && client.kpis[k] !== undefined && getStatus(k, client.kpis[k]) === "green").length;
                    const total = keys.filter(k => client.kpis[k] !== null && client.kpis[k] !== undefined).length || 1;
                    const pct = Math.round(green / total * 100);
                    const color = pct >= 70 ? "#3B6D11" : pct >= 50 ? "#854F0B" : "#A32D2D";
                    return (
                      <div key={client.id} onClick={() => { setSelectedClient(client); setView("cliente"); }} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: "0.5px solid var(--border)", cursor: "pointer" }}>
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
              <select onChange={e => {
                const cl = allClients.find(c => c.id === e.target.value);
                setSelectedClient(cl || null);
              }} value={selectedClient?.id || ""} style={{ padding: "6px 10px", borderRadius: 8, border: "0.5px solid var(--border)", background: "var(--surface)", color: "var(--text-primary)", fontSize: 13, cursor: "pointer" }}>
                <option value="">— Seleziona un cliente —</option>
                {data.coaches.map(coach => (
                  <optgroup key={coach.id} label={coach.name}>
                    {coach.clients.map(cl => (
                      <option key={cl.id} value={cl.id}>{cl.name} ({LEVEL_STYLE[cl.level]?.label})</option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>

            {selectedClient && (
              <Card>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
                  <div style={{ width: 42, height: 42, borderRadius: "50%", background: "#E6F1FB", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 500, fontSize: 14, color: "#185FA5", flexShrink: 0 }}>
                    {selectedClient.name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase()}
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
                  if (val === null || val === undefined) return null;
                  const b = BENCHMARKS[k];
                  const status = getStatus(k, val);
                  const color = STATUS_COLOR[status];
                  const bg = STATUS_BG[status];
                  const benchLabel = b.invert ? `< ${b.format(b.max)}` : `${b.format(b.min)} – ${b.format(b.max)}`;
                  return (
                    <div key={k} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: "0.5px solid var(--border)" }}>
                      <span style={{ flex: 1, fontSize: 13, color: "var(--text-secondary)" }}>{b.label}</span>
                      <span style={{ fontSize: 13, fontWeight: 500, background: bg, color, padding: "2px 8px", borderRadius: 6 }}>{b.format(val)}</span>
                      <span style={{ fontSize: 11, color: "var(--text-tertiary)", minWidth: 90, textAlign: "right" }}>{benchLabel}</span>
                    </div>
                  );
                })}
                {Object.values(selectedClient.kpis).every(v => v === null || v === undefined) && (
                  <div style={{ fontSize: 13, color: "var(--text-tertiary)", padding: "1rem 0", textAlign: "center" }}>
                    Nessun dato disponibile per questo cliente. Verifica che il file ODS sia nella cartella Drive corretta.
                  </div>
                )}
              </Card>
            )}
          </div>
        )}

        <div style={{ fontSize: 11, color: "var(--text-tertiary)", textAlign: "center", marginTop: "2rem" }}>
          {data.updatedAt && `Dati caricati: ${new Date(data.updatedAt).toLocaleString("it")}`}
        </div>
      </div>
    </div>
  );
}
