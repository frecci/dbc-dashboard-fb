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
    q: `'${folderId}' in parents and trashed=false and (mimeType='application/vnd.oasis.opendocument.spreadsheet' or mimeType='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' or mimeType='application/vnd.ms-excel')`,
    fields: "files(id, name, mimeType, modifiedTime)",
    orderBy: "modifiedTime desc",
  });
  return res.data.files || [];
}

export async function downloadFile(drive, fileId) {
  const res = await drive.files.get(
    { fileId, alt: "media" },
    { responseType: "arraybuffer" }
  );
  return Buffer.from(res.data);
}
