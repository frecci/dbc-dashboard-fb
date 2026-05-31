import { getDriveClient, listFolders, listFiles, downloadFile } from "@/lib/drive";
import { parseOdsKpis, parseXlsxKpis } from "@/lib/kpi";
import * as XLSX from "xlsx";

const ROOT_FOLDER_ID = process.env.DRIVE_ROOT_FOLDER_ID || "1WsN8SPQ1zMn9RpQdjciJ8lTKVkPTXPC6";

export async function GET() {
  try {
    const drive = getDriveClient();
    const coachFolders = await listFolders(drive, ROOT_FOLDER_ID);
    const coaches = [];

    for (const coachFolder of coachFolders) {
      const coachName = coachFolder.name.replace("DBC - ", "").trim();
      const clientFolders = await listFolders(drive, coachFolder.id);
      const clients = [];

      for (const clientFolder of clientFolders) {
        const files = await listFiles(drive, clientFolder.id);
        let kpis = {};
        let lastUpdate = null;

        for (const file of files.slice(0, 3)) {
          try {
            const buffer = await downloadFile(drive, file.id);
            const workbook = XLSX.read(buffer, { type: "buffer" });
            const allSheets = {};
            workbook.SheetNames.forEach(name => {
              allSheets[name] = XLSX.utils.sheet_to_json(workbook.Sheets[name], { header: 1, defval: null });
            });

            const sheetNames = workbook.SheetNames.join(" ").toLowerCase();
            if (sheetNames.includes("saturazione") || sheetNames.includes("customer") || sheetNames.includes("cashflow")) {
              Object.values(allSheets).forEach(rows => {
                const parsed = parseOdsKpis(rows);
                kpis = { ...kpis, ...parsed };
              });
            } else {
              const parsed = parseXlsxKpis(allSheets);
              kpis = { ...kpis, ...parsed };
            }

            if (!lastUpdate || new Date(file.modifiedTime) > new Date(lastUpdate)) {
              lastUpdate = file.modifiedTime;
            }
          } catch (e) {
            console.error("Error parsing file", file.name, e.message);
          }
        }

        const nameParts = clientFolder.name.replace("DBC - ", "").split(" - ");
        const level = detectLevel(clientFolder.name);

        clients.push({
          id: clientFolder.id,
          name: nameParts[0] || clientFolder.name,
          folderName: clientFolder.name,
          level,
          kpis,
          lastUpdate,
          filesCount: files.length,
        });
      }

      coaches.push({
        id: coachFolder.id,
        name: coachName,
        clients,
      });
    }

    return Response.json({ coaches, updatedAt: new Date().toISOString() });
  } catch (error) {
    console.error("Drive API error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}

function detectLevel(folderName) {
  const n = folderName.toLowerCase();
  if (n.includes("quantico") || n.includes("qua")) return "quantico";
  if (n.includes("avanzato") || n.includes("ava")) return "avanzato";
  return "base";
}
