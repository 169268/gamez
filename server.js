const http = require("http");
const fs = require("fs");
const path = require("path");
const { WebSocketServer } = require("ws");

const html = fs.readFileSync(path.join(__dirname, "index.html"));
const server = http.createServer((req, res) => {
  res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
  res.end(html);
});

const wss = new WebSocketServer({ server, maxPayload: 8192 });
const rooms = new Map();

wss.on("connection", (ws) => {
  ws.on("message", (raw) => {
    let m;
    try { m = JSON.parse(raw); } catch { return; }
    if (m.join) {
      if (typeof m.join !== "string" || m.join.length > 30) return;
      ws.room = m.join;
      if (!rooms.has(ws.room)) rooms.set(ws.room, new Set());
      rooms.get(ws.room).add(ws);
      return;
    }
    if (!ws.room || typeof m.topic !== "string") return;
    const out = JSON.stringify({ topic: m.topic, data: m.data });
    for (const c of rooms.get(ws.room)) {
      if (c !== ws && c.readyState === 1) c.send(out);
    }
  });
  ws.on("close", () => {
    const s = rooms.get(ws.room);
    if (s) { s.delete(ws); if (!s.size) rooms.delete(ws.room); }
  });
});

setInterval(() => wss.clients.forEach((c) => c.ping()), 25000);
server.listen(process.env.PORT || 3000);
