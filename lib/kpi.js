export const BENCHMARKS = {
  "prime_visite": { label: "Prime visite / poltrona / sett.", min: 1.5, max: 2, format: v => v.toFixed(1), invert: false },
  "saturazione_studio": { label: "Saturazione studio", min: 0.75, max: 0.85, format: v => Math.round(v * 100) + "%", invert: false },
  "saturazione_titolare": { label: "Saturazione titolare", min: 0, max: 0.60, format: v => Math.round(v * 100) + "%", invert: true },
  "fatturato_poltrona": { label: "Fatturato / poltrona", min: 200000, max: 250000, format: v => "€" + Math.round(v / 1000) + "k", invert: false },
  "pazienti_attivi": { label: "Pazienti attivi / poltrona", min: 550, max: 690, format: v => Math.round(v).toString(), invert: false },
  "valore_medio_paziente": { label: "Valore medio paziente", min: 360, max: 500, format: v => "€" + Math.round(v), invert: false },
  "accettazione_nuovi": { label: "Accettazione nuovi paz.", min: 0.50, max: 0.60, format: v => Math.round(v * 100) + "%", invert: false },
  "accettazione_storici": { label: "Accettazione storici", min: 0.85, max: 1, format: v => Math.round(v * 100) + "%", invert: false },
  "indice_incasso": { label: "Indice di incasso", min: 0.98, max: 1.03, format: v => v.toFixed(2), invert: false },
  "mol": { label: "Incidenza MOL", min: 0.20, max: 0.30, format: v => Math.round(v * 100) + "%", invert: false },
  "crediti_scaduti": { label: "Crediti scaduti", min: 0, max: 0.03, format: v => Math.round(v * 100) + "%", invert: true },
  "riserva_liquidita": { label: "Riserva liquidità", min: 0.10, max: 0.15, format: v => Math.round(v * 100) + "%", invert: false },
  "preventivi_emessi": { label: "Preventivi emessi / poltrona / anno", min: 100, max: 150, format: v => Math.round(v).toString(), invert: false },
  "chiusura_nuovi": { label: "% Chiusura nuovi paz.", min: 0.50, max: 0.60, format: v => Math.round(v * 100) + "%", invert: false },
  "produzione_settimanale": { label: "Produzione settimanale (€)", min: 0, max: 999999, format: v => "€" + Math.round(v).toLocaleString("it"), invert: false },
};

export function getStatus(key, value) {
  const b = BENCHMARKS[key];
  if (!b || value === null || value === undefined) return "gray";
  if (b.invert) {
    if (value <= b.max) return "green";
    if (value <= b.max * 1.5) return "yellow";
    return "red";
  }
  if (value >= b.min && value <= b.max) return "green";
  if (value >= b.min * 0.85) return "yellow";
  return "red";
}

export function parseOdsKpis(rows) {
  const kpis = {};
  const findRow = (label) => rows.find(r => r[0] && r[0].toString().toLowerCase().includes(label.toLowerCase()));

  const satRow = findRow("Percentuale Saturazione");
  if (satRow) kpis.saturazione_studio = parseFloat(satRow[1]) || null;

  const titRow = findRow("Produzione Titolare");
  if (titRow) kpis.saturazione_titolare = parseFloat(titRow[1]) || null;

  const prodRow = findRow("Valore Produzione");
  if (prodRow) kpis.produzione_settimanale = parseFloat(prodRow[1]) || null;

  const pvNuovi = findRow("Prime Visite Nuovi");
  if (pvNuovi) kpis.prime_visite_nuovi = parseFloat(pvNuovi[1]) || null;

  const pvRiattiv = findRow("Riattiv");
  if (pvRiattiv) kpis.prime_visite_riattivati = parseFloat(pvRiattiv[1]) || null;

  const prevEmessi = findRow("Preventivi Emessi");
  if (prevEmessi) kpis.preventivi_emessi_num = parseFloat(prevEmessi[1]) || null;

  const prevConf = findRow("Preventivi Confermati");
  if (prevConf) kpis.preventivi_confermati_num = parseFloat(prevConf[1]) || null;

  const chiusura = findRow("Percentuale di Chiusura (solo");
  if (chiusura) kpis.accettazione_nuovi = parseFloat(chiusura[1]) || null;

  const chiusuraGen = findRow("Percentuale di Chiusura (Gen");
  if (chiusuraGen) kpis.accettazione_storici = parseFloat(chiusuraGen[1]) || null;

  const incassato = findRow("Totale Incassato");
  if (incassato) kpis.totale_incassato = parseFloat(incassato[1]) || null;

  const ricavi = findRow("Ricavi del Periodo");
  if (ricavi && ricavi[1]) {
    const r = parseFloat(ricavi[1]);
    const i = kpis.totale_incassato;
    if (r && i) kpis.indice_incasso = parseFloat((i / r).toFixed(3));
  }

  const crediti = findRow("Crediti Scaduti");
  if (crediti) kpis.crediti_scaduti_valore = parseFloat(crediti[1]) || null;

  const igiene = findRow("Sedute di Igiene");
  if (igiene) kpis.sedute_igiene = parseFloat(igiene[1]) || null;

  return kpis;
}

export function parseXlsxKpis(sheets) {
  const kpis = {};
  Object.values(sheets).forEach(rows => {
    const findRow = (label) => rows.find(r => r[0] && r[0].toString().toLowerCase().includes(label.toLowerCase()));

    const ricavi = findRow("Ricavi");
    if (ricavi && ricavi[1]) kpis.fatturato_annuo = parseFloat(ricavi[1]) || null;

    const mol = findRow("MOL");
    if (mol && mol[1] && mol[2]) {
      const molVal = parseFloat(mol[1]);
      const ricaviVal = parseFloat(ricavi?.[1]);
      if (molVal && ricaviVal) kpis.mol = parseFloat((molVal / ricaviVal).toFixed(3));
    }
  });
  return kpis;
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
