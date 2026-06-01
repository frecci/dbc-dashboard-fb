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
  // Trova la riga di intestazione cercando "NOME CLIENTE" o "NOME"
  let headerRow = -1;
  let colMap = {};

  for (let i = 0; i < Math.min(rows.length, 10); i++) {
    const row = rows[i];
    if (!row) continue;
    const joined = row.join("|").toUpperCase();
    if (joined.includes("NOME") && joined.includes("RICAVI")) {
      headerRow = i;
      row.forEach((cell, idx) => {
        const c = String(cell || "").toLowerCase().trim();
        if (c.includes("nome")) colMap.NOME = idx;
        else if (c.includes("location")) colMap.LOCATION = idx;
        else if (c.includes("tipo")) colMap.TIPO = idx;
        else if (c.includes("periodo") || c.includes("anno")) colMap.PERIODO = idx;
        else if (c.includes("poltrona") && !c.includes("ricavi")) colMap.POLTRONE = idx;
        else if (c.includes("ricavi") && !c.includes("poltrona") && !c.includes("scost")) colMap.RICAVI = idx;
        else if (c.includes("mol") && c.includes("%")) colMap.MOL_PERC = idx;
        else if (c.includes("mol") && !c.includes("%") && !c.includes("scost")) colMap.MOL = idx;
        else if (c.includes("ricavi") && c.includes("poltrona")) colMap.RIC_POLTR = idx;
        else if (c.includes("note")) colMap.NOTE = idx;
        else if (c.includes("pax") || c.includes("dipendenti")) colMap.NR_PAX = idx;
      });
      break;
    }
  }

  // Fallback colonne fisse se non trova intestazione
  if (Object.keys(colMap).length < 4) {
    colMap = { NOME: 0, LOCATION: 1, TIPO: 2, PERIODO: 3, POLTRONE: 4, RICAVI: 5, NR_PAX: 7, MOL: 8, MOL_PERC: 9, RIC_POLTR: 11, NOTE: 12 };
    headerRow = 1; // salta prime 2 righe
  }

  const clients = {};
  let currentClient = null;

  for (let i = headerRow + 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.length === 0) continue;

    const rawNome = String(row[colMap.NOME] || "").trim();
    const periodoRaw = row[colMap.PERIODO];
    const periodo = parseFloat(String(periodoRaw || "").replace(",", "."));

    // Nuovo cliente se la cella nome non è vuota e non è un numero
    if (rawNome && rawNome !== "" && isNaN(parseFloat(rawNome))) {
      currentClient = rawNome;
      if (!clients[currentClient]) {
        clients[currentClient] = {
          nome:     currentClient,
          location: String(row[colMap.LOCATION] || "").trim(),
          anni:     [],
        };
      }
    }

    if (!currentClient || isNaN(periodo) || periodo < 2000 || periodo > 2030) continue;

    const ricavi    = parseNumeric(row[colMap.RICAVI]);
    const mol       = parseNumeric(row[colMap.MOL]);
    const molRaw    = parseNumeric(row[colMap.MOL_PERC]);
    const poltrone  = parseNumeric(row[colMap.POLTRONE]);
    const ricPoltr  = parseNumeric(row[colMap.RIC_POLTR]);
    const tipo      = String(row[colMap.TIPO] || "").trim();
    const note      = String(row[colMap.NOTE] || "").trim();

    // Normalizza MOL%: se > 2 è già percentuale (es. 14.5), se <= 2 è decimale (es. 0.145)
    let molPerc = null;
    if (molRaw !== null) {
      molPerc = Math.abs(molRaw) <= 2 ? Math.round(molRaw * 100 * 10) / 10 : Math.round(molRaw * 10) / 10;
    } else if (mol !== null && ricavi !== null && ricavi > 0) {
      // Calcola MOL% da MOL€ / Ricavi se non disponibile
      molPerc = Math.round((mol / ricavi) * 100 * 10) / 10;
    }

    // Salta righe senza dati utili
    if (ricavi === null && mol === null) continue;

    clients[currentClient].anni.push({
      anno: periodo,
      tipo,
      poltrone,
      ricavi,
      mol,
      molPerc,
      ricaviPoltrona: ricPoltr,
      note,
    });
  }

  return Object.values(clients).map((c) => ({
    ...c,
    anni: c.anni.sort((a, b) => a.anno - b.anno),
  }));
}

function parseNumeric(val) {
  if (val === undefined || val === null || val === "" || val === "ND" || val === "#VALUE!" || val === "#DIV/0!") return null;
  const n = parseFloat(String(val).replace(",", ".").replace("%", "").trim());
  return isNaN(n) ? null : n;
}

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
