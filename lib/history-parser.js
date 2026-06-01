// lib/history-parser.js
import { google } from "googleapis";

const COACH_SHEET_MAP = {
  sabrina:  "Sabrina",
  silvia:   "Silvia",
  alex:     "Alex",
  federica: "Federica",
  frecci:   "Frecci ",
  frency:   "Frency",
  marica:   "Marica",
  ghiro:    "Ghiro",
};

function getGoogleAuth() {
  const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY);
  return new google.auth.GoogleAuth({
    credentials,
    scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
  });
}

export async function getCoachHistory(fileId, coachName) {
  const auth = await getGoogleAuth();
  const sheets = google.sheets({ version: "v4", auth });
  const sheetName = COACH_SHEET_MAP[coachName.toLowerCase()];
  if (!sheetName) throw new Error(`Coach "${coachName}" non trovato.`);

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: fileId,
    range: `${sheetName}!A1:N600`,
  });

  const rows = res.data.values || [];
  return parseCoachSheet(rows);
}

function parseCoachSheet(rows) {
  // Struttura fissa osservata:
  // Riga 1: titolo
  // Riga 2: intestazioni (NOME CLIENTE, LOCATION, TIPO, PERIODO, NR POLTRONE, RICAVI, SCOST, NR PAX, MOL, MOL%, SCOST MOL, Ricavi a poltrona, Note)
  // Riga 3+: dati

  // Colonne fisse (0-indexed):
  // A=0 NOME, B=1 LOCATION, C=2 TIPO, D=3 PERIODO, E=4 NR POLTRONE,
  // F=5 RICAVI, G=6 SCOST, H=7 NR PAX, I=8 MOL, J=9 MOL%, K=10 SCOST MOL, L=11 Ricavi a poltrona, M=12 Note

  const DATA_START = 2; // inizia da riga 3 (index 2)

  const clients = {};
  let currentClient = null;

  for (let i = DATA_START; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.length === 0) continue;

    const rawNome = cleanStr(row[0]);
    const periodoRaw = cleanStr(row[3]);
    const periodo = parseFloat(periodoRaw);

    // Nuovo cliente se colonna A non è vuota e non è un numero
    if (rawNome && isNaN(parseFloat(rawNome))) {
      currentClient = rawNome;
      if (!clients[currentClient]) {
        clients[currentClient] = {
          nome:     currentClient,
          location: cleanStr(row[1]),
          anni:     [],
        };
      }
    }

    if (!currentClient) continue;
    if (isNaN(periodo) || periodo < 2000 || periodo > 2030) continue;

    const ricavi       = parseEuro(row[5]);
    const mol          = parseEuro(row[8]);
    const molPercRaw   = parsePerc(row[9]);
    const poltrone     = parseNum(row[4]);
    const ricaviPoltr  = parseEuro(row[11]);
    const tipo         = cleanStr(row[2]);
    const note         = cleanStr(row[12]);

    if (ricavi === null && mol === null) continue;

    // Normalizza MOL%
    let molPerc = molPercRaw;
    if (molPerc === null && mol !== null && ricavi !== null && ricavi !== 0) {
      molPerc = Math.round((mol / ricavi) * 1000) / 10;
    }

    clients[currentClient].anni.push({
      anno: periodo, tipo, poltrone, ricavi, mol, molPerc, ricaviPoltrona: ricaviPoltr, note,
    });
  }

  return Object.values(clients).map(c => ({
    ...c,
    anni: c.anni.sort((a, b) => a.anno - b.anno),
  }));
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function cleanStr(val) {
  return String(val ?? "").trim();
}

// Parsa valori con € e separatori italiani: "€ 468.095" → 468095
function parseEuro(val) {
  if (val === undefined || val === null || val === "") return null;
  const s = String(val).replace(/€/g, "").replace(/\s/g, "").replace(/\./g, "").replace(",", ".").trim();
  if (s === "" || s === "ND" || s === "#VALUE!" || s === "#DIV/0!") return null;
  const n = parseFloat(s);
  return isNaN(n) ? null : n;
}

// Parsa percentuali: "14,00%" → 14.0 oppure "0,14" → 14.0
function parsePerc(val) {
  if (val === undefined || val === null || val === "") return null;
  const s = String(val).replace(/\s/g, "").trim();
  if (s === "" || s === "ND" || s === "#VALUE!" || s === "#DIV/0!" || s === "#N/D") return null;
  
  const hasPercSign = s.includes("%");
  const cleaned = s.replace(/%/g, "").replace(",", ".").trim();
  const n = parseFloat(cleaned);
  if (isNaN(n)) return null;
  
  // Se ha il simbolo % è già percentuale (es. "14%" → 14)
  // Se non ha % ed è <= 2 è decimale (es. 0.14 → 14%)
  if (hasPercSign) return Math.round(n * 10) / 10;
  if (Math.abs(n) <= 2) return Math.round(n * 100 * 10) / 10;
  return Math.round(n * 10) / 10;
}

// Parsa numero semplice
function parseNum(val) {
  if (val === undefined || val === null || val === "") return null;
  const n = parseFloat(String(val).replace(",", ".").trim());
  return isNaN(n) ? null : n;
}

export function toChartData(client) {
  return client.anni.map(a => ({
    anno: a.anno, ricavi: a.ricavi, mol: a.mol, molPerc: a.molPerc,
    ricaviPoltrona: a.ricaviPoltrona, poltrone: a.poltrone, tipo: a.tipo, note: a.note,
  }));
}
