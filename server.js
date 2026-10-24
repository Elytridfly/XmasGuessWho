const fs = require("fs");
const http = require("http");
const path = require("path");
const { listCards } = require("./lib/drive");

const PORT = Number(process.env.PORT) || 5173;
const ROOT = __dirname;
const BLOCKED = new Set([".env", ".git", "api", "lib", "node_modules"]);

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
};

function send(res, status, body, headers) {
  res.writeHead(status, headers);
  res.end(body);
}

function serveStatic(req, res) {
  const url = new URL(req.url, "http://localhost");
  let relative = decodeURIComponent(url.pathname);
  if (relative === "/") relative = "/index.html";

  const requested = path.normalize(relative).replace(/^[/\\]+/, "");
  const top = requested.split(/[/\\]/)[0];
  if (BLOCKED.has(top) || requested.endsWith(".env")) {
    send(res, 404, "Not found");
    return;
  }

  const filePath = path.join(ROOT, requested);
  if (!filePath.startsWith(ROOT) || !fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
    send(res, 404, "Not found");
    return;
  }

  const type = TYPES[path.extname(filePath).toLowerCase()] || "application/octet-stream";
  send(res, 200, fs.readFileSync(filePath), { "Content-Type": type });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, "http://localhost");

  if (url.pathname === "/api/cards") {
    try {
      const cards = await listCards();
      send(res, 200, JSON.stringify({ cards }), {
        "Content-Type": "application/json; charset=utf-8",
      });
    } catch (error) {
      send(
        res,
        500,
        JSON.stringify({
          error:
            error.message ||
            "Could not load images from Google Drive. Check that the folder is shared with anyone who has the link.",
        }),
        { "Content-Type": "application/json; charset=utf-8" }
      );
    }
    return;
  }

  if (req.method !== "GET" && req.method !== "HEAD") {
    send(res, 405, "Method not allowed");
    return;
  }

  serveStatic(req, res);
});

server.listen(PORT, () => {
  console.log(`Guess Who running at http://127.0.0.1:${PORT}`);
});
