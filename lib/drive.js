const fs = require("fs");
const path = require("path");

function loadEnv() {
  const envPath = path.join(__dirname, "..", ".env");
  if (!fs.existsSync(envPath)) return;

  const lines = fs.readFileSync(envPath, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = value;
  }
}

function folderIdFrom(value) {
  const text = String(value || "").trim();
  if (!text) return "";
  const fromUrl = text.match(/\/folders\/([a-zA-Z0-9_-]+)/);
  if (fromUrl) return fromUrl[1];
  return text.replace(/[?].*$/, "");
}

function nameFromFile(filename) {
  return filename
    .replace(/\.[^.]+$/, "")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function imageUrl(fileId) {
  return `https://drive.google.com/thumbnail?id=${encodeURIComponent(
    fileId
  )}&sz=w1000`;
}

async function listCards() {
  loadEnv();

  const folderId = folderIdFrom(process.env.DRIVE_FOLDER);
  const apiKey = String(process.env.GOOGLE_API_KEY || "").trim();

  if (!folderId || !apiKey) {
    throw new Error(
      "Add DRIVE_FOLDER and GOOGLE_API_KEY to the .env file to load the cards."
    );
  }

  const files = [];
  let pageToken = "";

  do {
    const query = `'${folderId}' in parents and trashed = false and mimeType contains 'image/'`;
    const params = new URLSearchParams({
      q: query,
      fields: "nextPageToken,files(id,name,mimeType)",
      pageSize: "1000",
      key: apiKey,
      supportsAllDrives: "true",
      includeItemsFromAllDrives: "true",
    });
    if (pageToken) params.set("pageToken", pageToken);

    const response = await fetch(
      `https://www.googleapis.com/drive/v3/files?${params.toString()}`
    );
    const data = await response.json();
    if (!response.ok) {
      const reason = data.error && data.error.message;
      throw new Error(reason || "Could not read the Drive folder.");
    }

    files.push(...(data.files || []));
    pageToken = data.nextPageToken || "";
  } while (pageToken);

  return files.map((file) => ({
    id: file.id,
    name: nameFromFile(file.name) || "Mystery",
    image: imageUrl(file.id),
  }));
}

module.exports = { listCards };
