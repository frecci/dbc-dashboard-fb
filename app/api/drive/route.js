import { getDriveClient, listFolders, listFiles, downloadFile } from "@/lib/drive";
import { parseRealXlsx } from "@/lib/kpi";
import * as XLSX from "xlsx";

const ROOT_FOLDER_ID = process.env.DRIVE_ROOT_FOLDER_ID;

export async function GET() {
  try {
    const drive = getDriveClient();
    const coachFolders = await listFolders(drive, ROOT_FOLDER_ID);
    const coaches = [];

    for (const coachFolder of coachFolders) {
      const coachName = coachFolder.name.replace(/^DBC\s*[-–]\s*/i, "").trim();
      const clientFolders = await listFolders(drive, coachFolder.id);
      const clients = [];

      for (const clientFolder of clientFolders) {
        const files = await listFiles(drive, clientFolder.id);
        let kpis = {};
        let lastUpdate = null;
        const debugInfo = { filesFound: files.map(f => ({ name: f.name, mime: f.mimeType })), sheetsFound: [] };

        for (const file of files.slice(0, 5)) {
          try {
            const buffer = await downloadFile(drive, file);
            const workbook = XLSX.read(buffer, { type: "buffer" });
            debugInfo.sheetsFound = workbook.SheetNames;
            const allSheets = {};
            workbook.SheetNames.forEach(name => {
              allSheets[name] = XLSX.utils.sheet_to_json(workbook.Sheets[name], { header: 1, defval: null });
            });
            const parsed = parseRealXlsx(allSheets);
            console.log("Parsed KPIs:", JSON.stringify(parsed));
            kpis = { ...kpis, ...parsed };
            if (!lastUpdate || new Date(file.modifiedTime) > new Date(lastUpdate)) {
              lastUpdate = file.modifiedTime;
            }
          } catch (e) {
            console.error("Error parsing file", file.name, e.message);
          }
        }

        console.log("Debug:", JSON.stringify(debugInfo));
        const level = detectLevel(clientFolder.name);
        const clientName = clientFolder.name.replace(/^DBC\s*[-–]\s*/i, "").replace(/\s*[-–]\s*(base|avanzato|quantico)/i, "").trim();

        clients.push({ id: clientFolder.id, name: clientName, level, kpis, lastUpdate, filesCount: files.length, _debug: debugInfo });
      }

      coaches.push({ id: coachFolder.id, name: coachName, clients });
    }

    return Response.json({ coaches, updatedAt: new Date().toISOString() });
  } catch (error) {
    console.error("Drive API error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}

function detectLevel(name) {
  const n = name.toLowerCase();
  if (n.includes("quantico") || n.includes("qua")) return "quantico";
  if (n.includes("avanzato") || n.includes("ava")) return "avanzato";
  return "base";
}
