// lib/kpi.js
// KPI definitivi DBC Dashboard — benchmark aggiornati

export const KPI_CONFIG = {

  // ─── 10 KPI PRINCIPALI ────────────────────────────────────────────────────

  primeVisite: {
    id: "primeVisite",
    label: "Prime Visite / Poltrona",
    unit: "/ sett.",
    benchmark: { min: 2, max: 2 },          // target: 2/settimana
    direction: "higherIsBetter",
    source: { sheet: "Dashboard", field: "prime_visite_poltrona" },
    format: "number",
  },

  saturazioneStudio: {
    id: "saturazioneStudio",
    label: "Saturazione Studio",
    unit: "%",
    benchmark: { min: 75, max: 80 },        // target: 75–80%
    direction: "range",
    source: { sheet: "Saturazione", field: "saturazione_studio" },
    format: "percent",
  },

  saturazioneTitolare: {
    id: "saturazioneTitolare",
    label: "Saturazione Titolare",
    unit: "%",
    benchmark: { min: null, max: 60 },      // target: <60%
    direction: "lowerIsBetter",
    source: { sheet: "Saturazione", field: "saturazione_titolare" },
    format: "percent",
  },

  fatturatoPoltrona: {
    id: "fatturatoPoltrona",
    label: "Fatturato / Poltrona",
    unit: "€",
    benchmark: { min: 200_000, max: 250_000 }, // target: €200k–€250k
    direction: "range",
    source: { sheet: "Dashboard", field: "fatturato_poltrona" },
    format: "currency",
  },

  pazientiAttiviPoltrona: {
    id: "pazientiAttiviPoltrona",
    label: "Pazienti Attivi / Poltrona",
    unit: "",
    benchmark: { min: 500, max: 500 },      // target: 500
    direction: "higherIsBetter",
    // ⚠️  NON presente nel file Excel attuale — vedere nota in fondo
    source: { sheet: null, field: null },
    format: "number",
    missingData: true,                       // flag per UI: mostra "dato non disponibile"
  },

  valoreMedioPaziente: {
    id: "valoreMedioPaziente",
    label: "Valore Medio Paziente",
    unit: "€",
    benchmark: { min: 500, max: 500 },      // target: €500
    direction: "higherIsBetter",
    source: { sheet: "Dashboard", field: "valore_medio_paziente" },
    format: "currency",
  },

  accettazionePreventivi: {
    id: "accettazionePreventivi",
    label: "Accettazione Preventivi",
    unit: "%",
    benchmark: { min: 70, max: 80 },        // target: 70–80%
    direction: "range",
    source: { sheet: "Customer Experience", field: "accettazione_preventivi" },
    format: "percent",
  },

  riservaLiquidita: {
    id: "riservaLiquidita",
    label: "Riserva Liquidità",
    unit: "% ricavi",
    benchmark: { min: 18, max: 22 },        // target: ~20% ricavi (±2%)
    direction: "range",
    source: { sheet: "CashFlow", field: "riserva_liquidita_perc" },
    format: "percent",
  },

  mol: {
    id: "mol",
    label: "MOL",
    unit: "%",
    benchmark: { min: 15, max: 20 },        // target: 15–20%
    direction: "range",
    source: { sheet: "Dashboard", field: "mol_perc" },
    format: "percent",
  },

  indiceIncasso: {
    id: "indiceIncasso",
    label: "Indice di Incasso",
    unit: "",
    benchmark: { min: 0.98, max: 1.03 },   // target: 0,98–1,03
    direction: "range",
    source: { sheet: "CashFlow", field: "indice_incasso" },
    format: "decimal2",
  },


  // ─── KPI AGGIUNTIVI DBC (nessun benchmark) ────────────────────────────────

  pazientiRiattivati: {
    id: "pazientiRiattivati",
    label: "Pazienti Riattivati",
    unit: "",
    benchmark: null,                        // nessun benchmark definito
    direction: "higherIsBetter",
    source: { sheet: "Customer Experience", field: "pazienti_riattivati" },
    format: "number",
  },

  produzioneDaEseguire: {
    id: "produzioneDaEseguire",
    label: "Produzione da Eseguire",
    unit: "€",
    benchmark: null,                        // nessun benchmark definito
    direction: "informational",
    source: { sheet: "Dashboard", field: "produzione_da_eseguire" },
    format: "currency",
  },

};


// ─── ORDINE DI VISUALIZZAZIONE ──────────────────────────────────────────────

export const KPI_ORDER = [
  "primeVisite",
  "saturazioneStudio",
  "saturazioneTitolare",
  "fatturatoPoltrona",
  "pazientiAttiviPoltrona",
  "valoreMedioPaziente",
  "accettazionePreventivi",
  "riservaLiquidita",
  "mol",
  "indiceIncasso",
  // KPI aggiuntivi
  "pazientiRiattivati",
  "produzioneDaEseguire",
];


// ─── HELPER: valuta se un valore è in benchmark ─────────────────────────────

/**
 * @param {string} kpiId
 * @param {number} value
 * @returns {"ok" | "warning" | "danger" | "no-benchmark"}
 */
export function evaluateKPI(kpiId, value) {
  const kpi = KPI_CONFIG[kpiId];
  if (!kpi || kpi.benchmark === null) return "no-benchmark";
  if (value == null || isNaN(value)) return "no-benchmark";

  const { min, max, direction } = { ...kpi.benchmark, direction: kpi.direction };

  switch (direction) {
    case "range":
      if (value >= min && value <= max) return "ok";
      if (value < min * 0.9 || value > max * 1.1) return "danger";
      return "warning";

    case "higherIsBetter":
      if (value >= min) return "ok";
      if (value >= min * 0.85) return "warning";
      return "danger";

    case "lowerIsBetter":
      if (value <= max) return "ok";
      if (value <= max * 1.15) return "warning";
      return "danger";

    default:
      return "no-benchmark";
  }
}


// ─── HELPER: formatta il valore per la UI ───────────────────────────────────

/**
 * @param {string} kpiId
 * @param {number} value
 * @param {string} [locale="it-IT"]
 * @returns {string}
 */
export function formatKPIValue(kpiId, value, locale = "it-IT") {
  const kpi = KPI_CONFIG[kpiId];
  if (!kpi || value == null || isNaN(value)) return "—";

  switch (kpi.format) {
    case "currency":
      return new Intl.NumberFormat(locale, {
        style: "currency", currency: "EUR", maximumFractionDigits: 0,
      }).format(value);

    case "percent":
      return `${value.toFixed(1)} %`;

    case "decimal2":
      return value.toFixed(2);

    case "number":
    default:
      return new Intl.NumberFormat(locale).format(value);
  }
}


/*
 * ─── NOTE IMPLEMENTATIVE ────────────────────────────────────────────────────
 *
 * PAZIENTI ATTIVI / POLTRONA
 *   Il campo non è presente nel file "Cruscotto Avanzato CoGe" attuale.
 *   Opzioni per gestirlo:
 *
 *   A) Aggiungere una colonna/cella dedicata nel file Excel (soluzione consigliata)
 *      → sheet "Dashboard", cella con nome definito es. "pazienti_attivi_poltrona"
 *
 *   B) Calcolarlo nel parser:
 *      pazientiAttiviPoltrona = totale_pazienti_attivi / numero_poltrone
 *      (richiede che entrambi i campi siano già nel file)
 *
 *   C) Mostrarlo in dashboard con badge "Dato non disponibile" finché
 *      il campo missingData === true (già flaggato nel config sopra)
 *
 *   → Decisione da prendere con il team prima del prossimo deploy.
 */
