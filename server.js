const http = require("http");
const fs = require("fs");
const path = require("path");
const { WebSocketServer } = require("ws");

const html = fs.readFileSync(path.join(__dirname, "index.html"));
const server = http.createServer((req, res) => {
  res.writeHead(200, { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-cache" });
  res.end(html);
});

const wss = new WebSocketServer({ server, maxPayload: 65536 });
const rooms = new Map(); // code -> { cl:Set<ws>, G:game|null, tm:interval, gc:timeout }

const GS = ["حكّ راسك", "حطّ يدك على بوزك", "تنحنح", "غمّز بعينك اليمنى", "حطّ يدك على كتفك",
  "حرّك رجلك", "خبّط بصباعك على الطاولة مرتين", "عضّ شفتك", "ابتسم ابتسامة صغيرة", "حكّ ودنك"];

const shuffle = (a) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const four = (h) => h.length === 4 && h.every((c) => c % 10 === h[0] % 10);
const newG = () => ({ p: ["", "", "", ""], i: ["", "", "", ""], h: [[], [], [], []], t: [], d: [], v: [0, 0, 0, 0],
  ph: "lobby", w: -1, m: "", st: [0, 0, 0, 0], sc: [0, 0], lg: [], ls: -1, ch: [], sg: ["", ""], lc: [0, 0, 0, 0] });

function deal(G) {
  const d = shuffle(Array.from({ length: 40 }, (_, i) => i));
  G.h = [d.splice(0, 4), d.splice(0, 4), d.splice(0, 4), d.splice(0, 4)];
  G.t = d.splice(0, 4); G.d = d; G.v = [0, 0, 0, 0]; G.ph = "play"; G.w = -1; G.m = "";
  G.st = [0, 0, 0, 0]; G.lg = []; G.ls = -1;
  const g = shuffle(GS.slice()); G.sg = [g[0], g[1]];
}
const log = (G, e) => { G.lg.push(e); if (G.lg.length > 14) G.lg.shift(); };
function finish(G, w, m) { G.ph = "end"; G.w = w; G.m = m; G.sc[w]++; }

// كل لاعب ياخذ نسخة من الحالة فيها ورقو برك، وإشارة فريقو برك
function snap(G, ws) {
  const s = G.i.indexOf(ws.cid);
  return JSON.stringify({ topic: "s", data: {
    p: G.p,
    i: G.i.map((id, k) => (k === s || id.startsWith("bot") ? id : id ? "p" : "")),
    h: G.h.map((h, k) => (k === s || G.ph === "end" ? h : [])),
    t: G.t, v: G.v, ph: G.ph, w: G.w, m: G.m, sc: G.sc,
    lg: G.lg.slice(-10), ls: G.ls,
    sg: G.sg.map((g, t) => (s >= 0 && t === s % 2 ? g : null)),
    ch: G.ch.slice(-14),
  } });
}
function bc(r) {
  const G = r.G;
  for (const c of r.cl) if (c.readyState === 1 && G.i.includes(c.cid)) c.send(snap(G, c));
}

function run(r, G, s, m) {
  const me = s % 2;
  if (m.t === "chat") {
    const x = String(m.x || "").trim().slice(0, 80), now = Date.now();
    if (x && now - G.lc[s] > 400) {
      G.lc[s] = now;
      G.ch.push({ k: s, x, id: now + "-" + Math.random() });
      if (G.ch.length > 30) G.ch.shift();
    }
    return bc(r);
  }
  if (G.ph === "lobby") {
    if (m.t === "bots" && s === 0) {
      for (let q = 1; q < 4; q++) if (!G.i[q]) { G.i[q] = "bot" + q; G.p[q] = "🤖 روبوت " + q; }
      if (m.go) deal(G);
    }
    if (m.t === "start" && s === 0 && G.i.indexOf("") < 0) deal(G);
    return bc(r);
  }
  if (G.ph === "end") { if (m.t === "again" && s === 0) deal(G); return bc(r); }
  if (m.t === "swap") {
    const a = G.h[s].indexOf(m.h), b = G.t.indexOf(m.b);
    if (a >= 0 && b >= 0) { G.h[s][a] = m.b; G.t[b] = m.h; G.v = [0, 0, 0, 0]; G.ls = m.h; log(G, { k: s, t: "swap", a: m.b, b: m.h }); }
  }
  if (m.t === "vote") {
    if (!G.v[s]) log(G, { k: s, t: "vote" });
    G.v[s] = 1;
    if (G.v.every(Boolean)) { G.d = G.d.concat(G.t); G.t = G.d.splice(0, 4); G.v = [0, 0, 0, 0]; G.ls = -1; log(G, { k: -1, t: "new" }); }
  }
  if (m.t === "gamez") {
    const ok = four(G.h[(s + 2) % 4]);
    finish(G, ok ? me : 1 - me, G.p[s] + " قال Gamez " + (ok ? "وكان صحيح ✅" : "وكان غالط ❌"));
  }
  if (m.t === "coupez") {
    const hit = [0, 1, 2, 3].some((k) => k % 2 !== me && four(G.h[k]));
    finish(G, hit ? me : 1 - me, G.p[s] + " قال Coupez " + (hit ? "وكان صحيح ✅" : "وكان غالط ❌"));
  }
  bc(r);
}

function tick(r) {
  const G = r.G;
  if (!G || G.ph !== "play") return;
  for (let k = 0; k < 4 && G.ph === "play"; k++) {
    if (!G.i[k].startsWith("bot")) continue;
    const h = G.h[k], cnt = {};
    let best = h[0] % 10;
    h.forEach((c) => { cnt[c % 10] = (cnt[c % 10] || 0) + 1; });
    for (const x in cnt) if (cnt[x] > cnt[best]) best = Number(x);
    if (four(G.h[(k + 2) % 4]) && Math.random() < 0.35) { run(r, G, k, { t: "gamez" }); continue; }
    if ([0, 1, 2, 3].some((j) => j % 2 !== k % 2 && four(G.h[j])) && Math.random() < 0.12) { run(r, G, k, { t: "coupez" }); continue; }
    if (Math.random() < 0.45) continue;
    const off = h.filter((c) => c % 10 !== best), want = G.t.filter((c) => c % 10 === best);
    if (off.length && want.length) { G.st[k] = 0; run(r, G, k, { t: "swap", h: off[0], b: want[0] }); }
    else if (++G.st[k] > 3) run(r, G, k, { t: "vote" });
  }
}

function act(r, ws, m) {
  if (!m || typeof m.t !== "string") return;
  if (m.t === "join") {
    if (typeof m.c !== "string" || m.c.length < 8 || m.c.length > 40) return;
    ws.cid = m.c;
    let G = r.G;
    if (!G) { if (!m.mk) return; G = r.G = newG(); r.tm = setInterval(() => tick(r), 1200); }
    if (G.i.indexOf(ws.cid) < 0 && G.ph === "lobby") {
      const f = G.i.indexOf("");
      if (f >= 0) { G.i[f] = ws.cid; G.p[f] = String(m.n || "لاعب").slice(0, 12); }
    }
    return bc(r);
  }
  const G = r.G;
  if (!G || !ws.cid) return;
  const s = G.i.indexOf(ws.cid);
  if (s < 0) return;
  run(r, G, s, m);
}

wss.on("connection", (ws) => {
  ws.on("message", (raw) => {
    let m;
    try { m = JSON.parse(raw); } catch { return; }
    if (m.join) {
      if (typeof m.join !== "string" || m.join.length > 30) return;
      ws.room = m.join;
      let r = rooms.get(ws.room);
      if (!r) { r = { cl: new Set(), G: null, tm: null, gc: null }; rooms.set(ws.room, r); }
      clearTimeout(r.gc);
      r.cl.add(ws);
      return;
    }
    const r = rooms.get(ws.room);
    if (!r || typeof m.topic !== "string") return;
    if (m.topic === "a") return act(r, ws, m.data);
    if (m.topic === "rtc") { // صوت: نمرّرو الرسائل للباقي
      const out = JSON.stringify({ topic: "rtc", data: m.data });
      for (const c of r.cl) if (c !== ws && c.readyState === 1) c.send(out);
    }
  });
  ws.on("close", () => {
    const code = ws.room, r = rooms.get(code);
    if (!r) return;
    r.cl.delete(ws);
    if (!r.cl.size) { // ننتظرو دقيقة قبل ما نفسخو الغرفة (باش اللي ينقطع يرجع)
      r.gc = setTimeout(() => { if (!r.cl.size) { clearInterval(r.tm); rooms.delete(code); } }, 60000);
    }
  });
});

setInterval(() => wss.clients.forEach((c) => c.ping()), 25000);
server.listen(process.env.PORT || 3000);
