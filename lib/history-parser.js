// lib/history-parser.js
// Legge il file "Case History Studi in coaching" da Google Drive
// e restituisce lo storico pluriennale per ogni cliente di un coach

import { google } from "googleapis";

// ─── Nomi sheet per coach ────────────────────────────────────────────────────
// Mappa il nome del coach al nome dello sheet nel file Case History
const COACH_SHEET_MAP = {
  sabrina: "Sabrina",
  silvia:  "Silvia",
  alex:    "Alex",
  federica:"Federica",
  frecci:  "Frecci ",   // nota: spazio finale nel file originale
  frency:  "Frency",
  marica:  "Marica",
  ghiro:   "Ghiro",
};

// ─── Colonne attese nello sheet (ordine fisso nel file Excel) ────────────────
const COL = {
  NOME:        0,   // NOME CLIENTE
  LOCATION:    1,   // LOCATION
  TIPO:        2,   // TIPO coaching
  PERIODO:     3,   // anno fiscale
  POLTRONE:    4,   // NR POLTRONE
  RICAVI:      5,   // RICAVI €
  SCOST_RIC:   6,   // SCOSTAMENTO RICAVI VS AFP
  NR_PAX:      7,   // NR PAX (dipendenti e collaboratori)
  MOL:         8,   // MOL €
  MOL_PERC:    9,   // MOL %
  SCOST_MOL:   10,  // SCOSTAMENTO MOL VS AFP
  RIC_POLTR:   11,  // Ricavi a poltrona
  NOTE:        12,  // Note
};

// ─── Auth Google ─────────────────────────────────────────────────────────────
function getGoogleAuth() {
  const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY);
  return new google.auth.GoogleAuth({
    credentials,
    scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
  });
}

// ─── Funzione principale ─────────────────────────────────────────────────────

/**
 * Legge lo storico pluriennale dei clienti di un coach dal file Case History.
 *
 * @param {string} fileId       - Google Drive file ID del file Case History
 * @param {string} coachName    - Nome del coach (es. "sabrina", "silvia")
 * @returns {Promise<ClientHistory[]>}
 */
export async function getCoachHistory(fileId, coachName) {
  const auth  = await getGoogleAuth();
  const sheets = google.sheets({ version: "v4", auth });

  const sheetName = COACH_SHEET_MAP[coachName.toLowerCase()];
  if (!sheetName) {
    throw new Error(`Coach "${coachName}" non trovato. Valori validi: ${Object.keys(COACH_SHEET_MAP).join(", ")}`);
  }

  // Legge tutto lo sheet (dalla riga 3 in poi, saltando intestazioni)
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: fileId,
    range: `${sheetName}!A3:M500`,
  });

  const rows = res.data.values || [];
  return parseCoachSheet(rows);
}

// ─── Parser righe ────────────────────────────────────────────────────────────

/**
 * Converte le righe raw dello sheet in struttura dati per cliente.
 * Nel file Excel, il nome cliente appare solo sulla prima riga del cliente;
 * le righe successive dello stesso cliente hanno la colonna NOME vuota.
 */
function parseCoachSheet(rows) {
  const clients = {};
  let currentClient = null;

  for (const row of rows) {
    if (!row || row.length === 0) continue;

    const rawNome = (row[COL.NOME] || "").trim();
    const periodo = parseFloat(row[COL.PERIODO]);

    // Se la riga ha un nome cliente, è un nuovo cliente
    if (rawNome && rawNome !== "" && isNaN(parseFloat(rawNome))) {
      currentClient = rawNome;
      if (!clients[currentClient]) {
        clients[currentClient] = {
          nome:     currentClient,
          location: (row[COL.LOCATION] || "").trim(),
          anni:     [],
        };
      }
    }

    // Salta righe senza cliente o senza anno valido
    if (!currentClient || isNaN(periodo)) continue;

    const ricavi   = parseNumeric(row[COL.RICAVI]);
    const mol      = parseNumeric(row[COL.MOL]);
    const molPerc  = parseNumeric(row[COL.MOL_PERC]);
    const poltrone = parseNumeric(row[COL.POLTRONE]);
    const ricPoltr = parseNumeric(row[COL.RIC_POLTR]);
    const tipo     = (row[COL.TIPO] || "").trim();
    const note     = (row[COL.NOTE] || "").trim();

    // Salta righe senza dati utili
    if (ricavi === null && mol === null) continue;

    clients[currentClient].anni.push({
      anno:            periodo,
      tipo,                          // es. "IMP EXE", "PMCP", "QL", "D4Y"
      poltrone,
      ricavi,
      mol,
      molPerc:         molPerc !== null ? Math.round(molPerc * 100 * 10) / 10 : null, // → percentuale
      ricaviPoltrona:  ricPoltr,
      note,
    });
  }

  // Ordina gli anni per ogni cliente
  return Object.values(clients).map((c) => ({
    ...c,
    anni: c.anni.sort((a, b) => a.anno - b.anno),
  }));
}

// ─── Helper ──────────────────────────────────────────────────────────────────

function parseNumeric(val) {
  if (val === undefined || val === null || val === "" || val === "ND") return null;
  const n = parseFloat(String(val).replace(",", "."));
  return isNaN(n) ? null : n;
}

// ─── API Route helper ─────────────────────────────────────────────────────────
// Usato da app/api/history/route.js

/**
 * Restituisce i dati storici formattati per i grafici della dashboard.
 * Output pronto per Recharts (array di { anno, ricavi, mol, molPerc, ricaviPoltrona })
 *
 * @param {ClientHistory} client
 * @returns {ChartData[]}
 */
export function toChartData(client) {
  return client.anni.map((a) => ({
    anno:           a.anno,
    ricavi:         a.ricavi,
    mol:            a.mol,
    molPerc:        a.molPerc,
    ricaviPoltrona: a.ricaviPoltrona,
    poltrone:       a.poltrone,
    tipo:           a.tipo,
    note:           a.note,
  }));
}
