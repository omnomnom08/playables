// Drive headless Chrome over CDP with *real* time, and tap once — the studio
// template sits on a loading splash otherwise.
import { spawn } from "node:child_process";
import { writeFileSync, mkdirSync } from "node:fs";
import { setTimeout as sleep } from "node:timers/promises";

const CHROME = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const PORT = 9333;
const OUT = "shots";
const SLUGS = process.argv.slice(2);
mkdirSync(OUT, { recursive: true });

const chrome = spawn(CHROME, [
  "--headless=new","--no-sandbox","--hide-scrollbars",
  "--use-angle=d3d11","--enable-gpu-rasterization","--ignore-gpu-blocklist",
  "--force-device-scale-factor=1","--window-size=540,960",
  "--autoplay-policy=no-user-gesture-required",
  "--remote-debugging-port=" + PORT, "about:blank",
], { stdio: "ignore" });

const http = async (p, method = "GET") =>
  (await fetch(`http://127.0.0.1:${PORT}${p}`, { method })).json();
for (let i = 0; i < 40; i++) { try { await http("/json/version"); break; } catch { await sleep(250); } }

class CDP {
  constructor(ws){ this.ws=ws; this.id=0; this.pend=new Map();
    ws.onmessage = e => { const m=JSON.parse(e.data); const r=this.pend.get(m.id);
      if(r){ this.pend.delete(m.id); m.error?r.rej(new Error(m.error.message)):r.res(m.result); } }; }
  send(method, params={}) { const id=++this.id;
    return new Promise((res,rej)=>{ this.pend.set(id,{res,rej});
      this.ws.send(JSON.stringify({id,method,params})); }); }
}

for (const slug of SLUGS) {
  const tab = await http(`/json/new?file:///D:/TechArtist/job/portfolio_site/site/play/${slug}.html`, "PUT");
  const ws = new WebSocket(tab.webSocketDebuggerUrl);
  await new Promise(r => ws.onopen = r);
  const cdp = new CDP(ws);
  try {
    await sleep(7000);                                    // let it actually load
    for (const type of ["mousePressed","mouseReleased"])  // tap centre to start
      await cdp.send("Input.dispatchMouseEvent",
        { type, x:270, y:520, button:"left", clickCount:1 });
    await sleep(5000);                                    // let gameplay settle
    const { data } = await cdp.send("Page.captureScreenshot", { format:"png" });
    writeFileSync(`${OUT}/${slug}.png`, Buffer.from(data, "base64"));
    console.log(`  ${slug.padEnd(28)} ${(Buffer.from(data,"base64").length/1024).toFixed(0)} KB`);
  } catch (e) { console.log(`  ${slug.padEnd(28)} FAILED ${e.message}`); }
  ws.close();
  await fetch(`http://127.0.0.1:${PORT}/json/close/${tab.id}`);
}
chrome.kill();
