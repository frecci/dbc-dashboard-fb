export function parseRealXlsx(sheets) {
  const kpis = {};
  const findVal = (rows, labelContains, col = 1) => {
    if (!rows) return null;
    const row = rows.find(r => r[0] && r[0].toString().toLowerCase().includes(labelContains.toLowerCase()));
    if (!row) return null;
    const v = parseFloat(row[col]);
    return isNaN(v) ? null : v;
  };
  const getSheet = (names) => { for (const n of names) { if (sheets[n]) return sheets[n]; } return null; };
  const dashboard = getSheet(["Dashboard","dashboard"]);
  const saturazione = getSheet(["Saturazione","Saturazione ","Saturazione  "]);
  const cex = getSheet(["Customer Experience","Customer Experience ","Customer Experience  "]);
  const cashflow = getSheet(["CashFlow","Cashflow","CashFlow ","CashFlow  "]);
  const nrPoltrone = findVal(dashboard, "Nr Poltrone", 1);
  kpis._nr_poltrone = nrPoltrone;
  const ricavi = findVal(cashflow, "Ricavi del Periodo", 1);
  kpis._ricavi = ricavi;
  if (ricavi && nrPoltrone) kpis.fatturato_poltrona = ricavi / nrPoltrone;
  const satStudio = findVal(saturazione, "Percentuale Saturazione", 1);
  if (satStudio) kpis.saturazione_studio = satStudio;
  const satTit = findVal(saturazione, "Percentuale Produzione Titolare", 1);
  if (satTit) kpis.saturazione_titolare = satTit;
  const primeVisite = findVal(saturazione, "Numero Prime Visite Nuovi Pazienti", 1);
  if (primeVisite && nrPoltrone) kpis.prime_visite = primeVisite / nrPoltrone / 48;
  const chiusuraNuovi = findVal(cex, "Percentuale di Chiusura (solo nuovi", 1);
  if (chiusuraNuovi) kpis.accettazione_nuovi = chiusuraNuovi;
  const chiusuraGen = findVal(cex, "Percentuale di Chiusura (Generale)", 1);
  if (chiusuraGen) kpis.accettazione_storici = chiusuraGen;
  const molPct = findVal(dashboard, "MOL", 2);
  if (molPct) kpis.mol = molPct;
  const creditiScaduti = findVal(cashflow, "Crediti Scaduti", 1);
  if (creditiScaduti !== null && ricavi) kpis.crediti_scaduti = creditiScaduti / ricavi;
  const incassiAnticipati = findVal(cashflow, "Percentuale Incassi Anticipati", 1);
  if (incassiAnticipati) kpis.riserva_liquidita = incassiAnticipati;
  const valoreMedioPrev = findVal(cex, "Valore Medio Prev. Confermati", 1);
  if (valoreMedioPrev) kpis.valore_medio_paziente = valoreMedioPrev;
  const prevEmessi = findVal(cex, "Numero Preventivi Emessi", 1);
  if (prevEmessi && nrPoltrone) kpis.preventivi_emessi = prevEmessi / nrPoltrone;
  return kpis;
}
export const BENCHMARKS = {
  "prime_visite": { label: "Prime visite / poltrona / sett.", min: 1.5, max: 2, format: v => v.toFixed(1), invert: false },
  "saturazione_studio": { label: "Saturazione studio", min: 0.75, max: 0.85, format: v => Math.round(v * 100) + "%", invert: false },
  "saturazione_titolare": { label: "Saturazione titolare", min: 0, max: 0.60, format: v => Math.round(v * 100) + "%", invert: true },
  "fatturato_poltrona": { label: "Fatturato / poltrona", min: 200000, max: 250000, format: v => "€" + Math.round(v / 1000) + "k", invert: false },
  "valore_medio_paziente": { label: "Valore medio preventivo confermato", min: 3000, max: 5000, format: v => "€" + Math.round(v), invert: false },
  "accettazione_nuovi": { label: "% Chiusura nuovi paz.", min: 0.50, max: 0.60, format: v => Math.round(v * 100) + "%", invert: false },
  "accettazione_storici": { label: "% Chiusura generale", min: 0.70, max: 0.80, format: v => Math.round(v * 100) + "%", invert: false },
  "mol": { label: "Incidenza MOL", min: 0.15, max: 0.25, format: v => Math.round(v * 100) + "%", invert: false },
  "crediti_scaduti": { label: "Crediti scaduti / ricavi", min: 0, max: 0.05, format: v => Math.round(v * 100) + "%", invert: true },
  "riserva_liquidita": { label: "% Incassi anticipati", min: 0.08, max: 0.15, format: v => Math.round(v * 100) + "%", invert: false },
  "preventivi_emessi": { label: "Preventivi emessi / poltrona", min: 80, max: 130, format: v => Math.round(v).toString(), invert: false },
};
export function getStatus(key, value) {
  const b = BENCHMARKS[key];
  if (!b || value === null || value === undefined) return "gray";
  if (b.invert) { if (value <= b.max) return "green"; if (value <= b.max * 2) return "yellow"; return "red"; }
  if (value >= b.min && value <= b.max) return "green";
  if (value >= b.min * 0.85) return "yellow";
  return "red";
}
export function avgKpis(clientsKpis) {
  const keys = Object.keys(BENCHMARKS);
  const result = {};
  keys.forEach(k => {
    const vals = clientsKpis.map(c => c[k]).filter(v => v !== null && v !== undefined && !isNaN(v));
    result[k] = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
  });
  return result;
}
