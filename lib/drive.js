import { google } from "googleapis";

export function getDriveClient() {
  const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY);
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ["https://www.googleapis.com/auth/drive.readonly"],
  });
  return google.drive({ version: "v3", auth });
}

export async function listFolders(drive, parentId) {
  const res = await drive.files.list({
    q: `'${parentId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`,
    fields: "files(id, name)",
    orderBy: "name",
  });
  return res.data.files || [];
}

export async function listFiles(drive, folderId) {
  const res = await drive.files.list({
    q: `'${folderId}' in parents and trashed=false`,
    fields: "files(id, name, mimeType, modifiedTime)",
    orderBy: "modifiedTime desc",
  });
  const files = res.data.files || [];
  return files.filter(f => 
    f.mimeType !== "application/vnd.google-apps.folder" &&
    (f.mimeType.includes("spreadsheet") || f.mimeType.includes("excel") || f.mimeType.includes("opendocument"))
  );
}

export async function downloadFile(drive, file) {
  if (file.mimeType === "application/vnd.google-apps.spreadsheet") {
    const res = await drive.files.export(
      { fileId: file.id, mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" },
      { responseType: "arraybuffer" }
    );
    return Buffer.from(res.data);
  }
  const res = await drive.files.get(
    { fileId: file.id, alt: "media" },
    { responseType: "arraybuffer" }
  );
  return Buffer.from(res.data);
}
