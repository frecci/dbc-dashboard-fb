// lib/kpi.js
// KPI definitivi DBC Dashboard — benchmark aggiornati

// ─── BENCHMARKS (compatibile con page.js) ───────────────────────────────────
export const BENCHMARKS = {
  fatturatoPoltrona:      { min: 200000, max: 250000, label: "Fatturato/Poltrona", format: (v) => `€${(v/1000).toFixed(0)}k`, invert: false },
  mol:                    { min: 15,     max: 20,     label: "MOL %",              format: (v) => `${v}%`,                      invert: false },
  saturazioneStudio:      { min: 75,     max: 80,     label: "Saturazione Studio", format: (v) => `${v}%`,                      invert: false },
  saturazioneTitolare:    { min: null,   max: 60,     label: "Sat. Titolare",      format: (v) => `${v}%`,                      invert: true  },
  valoreMedioPaziente:    { min: 500,    max: null,   label: "Valore Medio Pz.",   format: (v) => `€${v}`,                      invert: false },
  accettazionePreventivi: { min: 70,     max: 80,     label: "Accettazione Prev.", format: (v) => `${v}%`,                      invert: false },
  riservaLiquidita:       { min: 18,     max: 22,     label: "Riserva Liquidità",  format: (v) => `${v}%`,                      invert: false },
  indiceIncasso:          { min: 0.98,   max: 1.03,   label: "Indice Incasso",     format: (v) => v.toFixed(2),                 invert: false },
  primeVisite:            { min: 2,      max: null,   label: "Prime Visite/Poltr", format: (v) => `${v}/sett`,                  invert: false },
};

// ─── getStatus ───────────────────────────────────────────────────────────────
export function getStatus(kpiKey, value) {
  const b = BENCHMARKS[kpiKey];
  if (!b || value == null || isNaN(value)) return "gray";

  if (b.invert) {
    // lowerIsBetter
    if (b.max != null) {
      if (value <= b.max) return "green";
      if (value <= b.max * 1.15) return "yellow";
      return "red";
    }
    return "gray";
  }

  if (b.min != null && b.max != null) {
    if (value >= b.min && value <= b.max) return "green";
    if (value >= b.min * 0.85 && value <= b.max * 1.15) return "yellow";
    return "red";
  }
  if (b.min != null) {
    if (value >= b.min) return "green";
    if (value >= b.min * 0.85) return "yellow";
    return "red";
  }
  return "gray";
}

// ─── avgKpis ─────────────────────────────────────────────────────────────────
export function avgKpis(kpisArray) {
  if (!kpisArray || kpisArray.length === 0) return {};
  const keys = Object.keys(BENCHMARKS);
  const result = {};
  for (const k of keys) {
    const vals = kpisArray.map(kpis => kpis?.[k]).filter(v => v != null && !isNaN(v));
    result[k] = vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
  }
  return result;
}

// ─── parseRealXlsx ───────────────────────────────────────────────────────────
export function parseRealXlsx(allSheets) {
  const kpis = {};

  try {
    // Dashboard sheet
    const dash = allSheets["Dashboard"];
    if (dash) {
      const map = sheetToMap(dash);
      kpis.fatturatoPoltrona      = findValue(map, ["fatturato per poltrona", "fatturato/poltrona", "ricavi per poltrona", "ricavi/poltrona"]);
      kpis.mol                    = findValue(map, ["mol%", "mol %", "margine operativo lordo %", "mol"]);
      kpis.valoreMedioPaziente    = findValue(map, ["valore medio paziente", "valore medio pz", "ticket medio"]);
      kpis.primeVisite            = findValue(map, ["prime visite per poltrona", "prime visite/poltrona", "prime visite"]);
      kpis.produzioneDaEseguire   = findValue(map, ["produzione da eseguire", "produzione arretrata"]);
    }

    // Saturazione sheet
    const sat = allSheets["Saturazione"];
    if (sat) {
      const map = sheetToMap(sat);
      kpis.saturazioneStudio   = findValue(map, ["saturazione studio", "sat. studio", "saturazione"]);
      kpis.saturazioneTitolare = findValue(map, ["saturazione titolare", "sat. titolare"]);
    }

    // Customer Experience sheet
    const cx = allSheets["Customer Experience"];
    if (cx) {
      const map = sheetToMap(cx);
      kpis.accettazionePreventivi = findValue(map, ["accettazione preventivi", "accettazione", "tasso accettazione"]);
      kpis.pazientiRiattivati     = findValue(map, ["pazienti riattivati", "riattivati"]);
    }

    // CashFlow sheet
    const cf = allSheets["CashFlow"] || allSheets["Cash Flow"] || allSheets["Cashflow"];
    if (cf) {
      const map = sheetToMap(cf);
      kpis.riservaLiquidita = findValue(map, ["riserva liquidita", "riserva liquidità", "riserva"]);
      kpis.indiceIncasso    = findValue(map, ["indice di incasso", "indice incasso"]);
    }

  } catch (e) {
    console.error("parseRealXlsx error:", e.message);
  }

  return kpis;
}

// ─── helpers interni ─────────────────────────────────────────────────────────
function sheetToMap(rows) {
  const map = {};
  if (!rows) return map;
  for (const row of rows) {
    if (!row) continue;
    for (let i = 0; i < row.length - 1; i++) {
      const key = String(row[i] ?? "").toLowerCase().trim();
      const val = row[i + 1];
      if (key && val != null) map[key] = val;
    }
  }
  return map;
}

function findValue(map, keys) {
  for (const k of keys) {
    const v = map[k.toLowerCase()];
    if (v != null) {
      const n = parseFloat(String(v).replace(",", ".").replace("%", "").trim());
      if (!isNaN(n)) return n;
    }
  }
  return null;
}

// ─── KPI_CONFIG (per compatibilità futura) ───────────────────────────────────
export const KPI_CONFIG = {
  primeVisite:            { label: "Prime Visite / Poltrona",  unit: "/ sett.",   format: "number"   },
  saturazioneStudio:      { label: "Saturazione Studio",       unit: "%",         format: "percent"  },
  saturazioneTitolare:    { label: "Saturazione Titolare",     unit: "%",         format: "percent"  },
  fatturatoPoltrona:      { label: "Fatturato / Poltrona",     unit: "€",         format: "currency" },
  valoreMedioPaziente:    { label: "Valore Medio Paziente",    unit: "€",         format: "currency" },
  accettazionePreventivi: { label: "Accettazione Preventivi",  unit: "%",         format: "percent"  },
  riservaLiquidita:       { label: "Riserva Liquidità",        unit: "% ricavi",  format: "percent"  },
  mol:                    { label: "MOL",                      unit: "%",         format: "percent"  },
  indiceIncasso:          { label: "Indice di Incasso",        unit: "",          format: "decimal2" },
  pazientiRiattivati:     { label: "Pazienti Riattivati",      unit: "",          format: "number"   },
  produzioneDaEseguire:   { label: "Produzione da Eseguire",   unit: "€",         format: "currency" },
};
