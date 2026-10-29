const http = require("http");
const fs = require("fs");
const path = require("path");
const { WebSocketServer } = require("ws");

const html = fs.readFileSync(path.join(__dirname, "index.html"));
// ملفات التثبيت كتطبيق (PWA): الأيقونات والـmanifest والـservice worker، كل شيء داخل هذا الملف
const assets = {
  "/icon-192.png": { t: "image/png", b: Buffer.from("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", "base64") },
  "/icon-512.png": { t: "image/png", b: Buffer.from("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", "base64") },
  "/manifest.json": { t: "application/manifest+json; charset=utf-8", b: Buffer.from(JSON.stringify({"name": "Gamez", "short_name": "Gamez", "description": "لعبة ورق 2 ضد 2", "start_url": "/", "scope": "/", "display": "standalone", "orientation": "portrait", "background_color": "#0d3b46", "theme_color": "#0d3b46", "lang": "ar", "dir": "rtl", "icons": [{"src": "/icon-192.png", "sizes": "192x192", "type": "image/png", "purpose": "any"}, {"src": "/icon-512.png", "sizes": "512x512", "type": "image/png", "purpose": "any"}, {"src": "/icon-512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable"}]})) },
  "/sw.js": { t: "text/javascript", b: Buffer.from("self.addEventListener('install',()=>self.skipWaiting());self.addEventListener('activate',e=>e.waitUntil(clients.claim()));self.addEventListener('fetch',()=>{});") },
};
const server = http.createServer((req, res) => {
  const a = assets[req.url.split("?")[0]];
  if (a) {
    res.writeHead(200, { "Content-Type": a.t, "Cache-Control": a.t === "text/javascript" ? "no-cache" : "public, max-age=86400" });
    return res.end(a.b);
  }
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
// صاحب اللعبة = أول لاعب حقيقي (باش إذا خرج الأول، يوليو الأزرار عند اللي بعدو)
const hostSeat = (G) => G.i.findIndex((id) => id && !id.startsWith("bot"));

// كل لاعب ياخذ نسخة من الحالة فيها ورقو برك، وإشارة فريقو برك
function snap(G, ws) {
  const s = G.i.indexOf(ws.cid);
  return JSON.stringify({ topic: "s", data: {
    p: G.p,
    i: G.i.map((id, k) => (k === s || id.startsWith("bot") ? id : id ? "p" : "")),
    h: G.h.map((h, k) => (k === s || G.ph === "end" ? h : [])),
    hs: hostSeat(G), t: G.t, v: G.v, ph: G.ph, w: G.w, m: G.m, sc: G.sc,
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
    if (m.t === "bots" && s === hostSeat(G)) {
      for (let q = 1; q < 4; q++) if (!G.i[q]) { G.i[q] = "bot" + q; G.p[q] = "🤖 روبوت " + q; }
      if (m.go) deal(G);
    }
    if (m.t === "start" && s === hostSeat(G) && G.i.indexOf("") < 0) deal(G);
    return bc(r);
  }
  if (G.ph === "end") { if (m.t === "again" && s === hostSeat(G)) deal(G); return bc(r); }
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
    if (r.lv && r.lv[ws.cid]) clearTimeout(r.lv[ws.cid]);
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

// لاعب خرج: في الانتظار نحرّرو بلاصتو، وفي اللعبة يعوّضو روبوت
function leave(r, cid) {
  const G = r.G;
  if (!G) return;
  const s = G.i.indexOf(cid);
  if (s < 0) return;
  if (G.ph === "lobby") { G.i[s] = ""; G.p[s] = ""; }
  else { G.i[s] = "bot" + s; G.p[s] = "🤖 " + G.p[s].slice(0, 9); }
  bc(r);
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
    if (ws.cid && r.G) { // 15 ثانية باش يرجع كان انقطع النت، وإلا يدخل الروبوت
      r.lv = r.lv || {};
      clearTimeout(r.lv[ws.cid]);
      const cid = ws.cid;
      r.lv[cid] = setTimeout(() => { if (![...r.cl].some((c) => c.cid === cid)) leave(r, cid); }, 15000);
    }
    if (!r.cl.size) { // ننتظرو دقيقة قبل ما نفسخو الغرفة (باش اللي ينقطع يرجع)
      r.gc = setTimeout(() => { if (!r.cl.size) { clearInterval(r.tm); rooms.delete(code); } }, 60000);
    }
  });
});

setInterval(() => wss.clients.forEach((c) => c.ping()), 25000);
server.listen(process.env.PORT || 3000);
