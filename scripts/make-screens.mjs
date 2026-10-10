/**
 * Generates the example app screenshots ("Qamar Tasks") used by the starter
 * project and the repository examples. These are original StoreShot artwork —
 * a fictional app UI — rendered once and committed.
 *
 * Usage: node scripts/make-screens.mjs
 */
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { chromium } from "playwright-core";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const fontsDir = path.join(root, "assets", "fonts");
const outDir = path.join(root, "starter", "screens");

const FONT_FACES = `
@font-face { font-family: "QL"; font-weight: 400; src: url("fonts/IBMPlexSans-Regular.ttf"); }
@font-face { font-family: "QL"; font-weight: 600; src: url("fonts/IBMPlexSans-SemiBold.ttf"); }
@font-face { font-family: "QL"; font-weight: 700; src: url("fonts/IBMPlexSans-Bold.ttf"); }
@font-face { font-family: "QA"; font-weight: 400; src: url("fonts/IBMPlexSansArabic-Regular.ttf"); }
@font-face { font-family: "QA"; font-weight: 600; src: url("fonts/IBMPlexSansArabic-SemiBold.ttf"); }
@font-face { font-family: "QA"; font-weight: 700; src: url("fonts/IBMPlexSansArabic-Bold.ttf"); }
`;

const SHARED = `
${FONT_FACES}
* { margin: 0; padding: 0; box-sizing: border-box; }
html, body { width: 1080px; height: 2340px; overflow: hidden; }
body {
  font-family: "QA", "QL", "Segoe UI", sans-serif;
  background: #0B1220;
  color: #E8EDF7;
  -webkit-font-smoothing: antialiased;
}
.statusbar {
  display: flex; justify-content: space-between; align-items: center;
  padding: 34px 56px 18px; font-size: 38px; font-weight: 600;
}
.sb-icons { display: flex; gap: 14px; align-items: center; }
.sb-battery { width: 58px; height: 28px; border: 3px solid #8A94A8; border-radius: 8px; position: relative; }
.sb-battery::after { content: ""; position: absolute; inset: 4px; right: 55%; background: #E8EDF7; border-radius: 3px; }
.sb-wifi { width: 40px; height: 32px; border: 3px solid solid #8A94A8; }
.sb-signal { display: flex; gap: 6px; align-items: flex-end; height: 30px; }
.sb-signal i { width: 8px; background: #E8EDF7; border-radius: 3px; display: block; }
.sb-signal i:nth-child(1) { height: 12px; } .sb-signal i:nth-child(2) { height: 18px; }
.sb-signal i:nth-child(3) { height: 24px; } .sb-signal i:nth-child(4) { height: 30px; }
.tabbar {
  position: absolute; bottom: 0; left: 0; right: 0; height: 170px;
  background: rgba(13, 20, 36, 0.92);
  border-top: 2px solid rgba(255, 255, 255, 0.06);
  display: flex; justify-content: space-around; align-items: center;
  padding-bottom: 20px;
}
.tab { display: flex; flex-direction: column; align-items: center; gap: 10px; font-size: 28px; color: #667088; width: 200px; }
.tab.active { color: #62E6B5; }
.tab .dot { width: 54px; height: 54px; border-radius: 16px; background: currentColor; opacity: 0.9; }
`;

const CHECK = `<span class="check"></span>`;
const CHECK_DONE = `<span class="check done"><b>&#10003;</b></span>`;

const homeHtml = `<!DOCTYPE html><html lang="en" dir="ltr"><head><meta charset="utf-8"><style>
${SHARED}
.header { display: flex; justify-content: space-between; align-items: center; padding: 44px 56px 8px; }
.brand { display: flex; align-items: center; gap: 22px; }
.logo { width: 88px; height: 88px; border-radius: 26px; background: linear-gradient(135deg, #62E6B5, #2BB783);
  display: flex; align-items: center; justify-content: center; }
.logo::after { content: ""; width: 34px; height: 34px; border-radius: 50%; background: #0B1220; transform: translateX(10px); }
.brand h1 { font-family: "QL"; font-size: 52px; font-weight: 700; }
.avatar { width: 92px; height: 92px; border-radius: 50%; background: linear-gradient(135deg, #7C8CF8, #B28DF7); }
.date { padding: 26px 56px; font-size: 34px; color: #8A94A8; font-weight: 600; }
.section { padding: 30px 56px 18px; display: flex; justify-content: space-between; align-items: baseline; }
.section h2 { font-size: 42px; font-weight: 700; }
.section span { font-size: 30px; color: #62E6B5; font-weight: 600; }
.tasks { padding: 0 56px; display: flex; flex-direction: column; gap: 26px; }
.task { background: #131C2E; border: 2px solid rgba(255,255,255,0.05); border-radius: 30px; padding: 34px 36px;
  display: flex; align-items: center; gap: 28px; }
.check { width: 56px; height: 56px; border-radius: 50%; border: 3px solid #46506A; flex: none;
  display: flex; align-items: center; justify-content: center; }
.check.done { background: #62E6B5; border-color: #62E6B5; color: #06281B; }
.check b { font-size: 34px; }
.task .body { flex: 1; }
.task .body h3 { font-size: 40px; font-weight: 600; }
.task .body p { font-size: 30px; color: #8A94A8; margin-top: 8px; }
.task.done .body h3 { text-decoration: line-through; color: #667088; }
.chip { font-size: 26px; padding: 12px 24px; border-radius: 999px; background: rgba(98,230,181,0.14); color: #62E6B5; font-weight: 600; flex: none; }
.chip.violet { background: rgba(178,141,247,0.16); color: #B28DF7; }
.goal { margin: 34px 56px 0; background: linear-gradient(135deg, rgba(98,230,181,0.12), rgba(43,183,131,0.05));
  border: 2px solid rgba(98,230,181,0.25); border-radius: 34px; padding: 38px 42px; }
.goal .row { display: flex; justify-content: space-between; font-size: 34px; font-weight: 600; margin-bottom: 22px; }
.goal .row span { color: #8A94A8; font-weight: 400; }
.bar { height: 22px; background: rgba(255,255,255,0.08); border-radius: 999px; overflow: hidden; }
.bar i { display: block; height: 100%; width: 72%; background: linear-gradient(90deg, #2BB783, #62E6B5); border-radius: 999px; }
.fab { position: absolute; bottom: 220px; right: 56px; width: 130px; height: 130px; border-radius: 36px;
  background: #62E6B5; color: #06281B; font-size: 72px; font-weight: 400;
  display: flex; align-items: center; justify-content: center;
  box-shadow: 0 18px 40px rgba(98,230,181,0.35); }
</style></head><body>
<div class="statusbar"><span>9:41</span><div class="sb-icons">
  <span class="sb-signal"><i></i><i></i><i></i><i></i></span><span class="sb-battery"></span></div></div>
<div class="header">
  <div class="brand"><div class="logo"></div><h1>Qamar</h1></div>
  <div class="avatar"></div>
</div>
<div class="date">Tuesday, March 3</div>
<div class="section"><h2>Today</h2><span>3 of 6 done</span></div>
<div class="tasks">
  <div class="task done">${CHECK_DONE}<div class="body"><h3>Review launch checklist</h3><p>9:00 – 9:30 · Team</p></div><span class="chip">Work</span></div>
  <div class="task done">${CHECK_DONE}<div class="body"><h3>Send weekly update</h3><p>10:00 · Writing</p></div><span class="chip violet">Focus</span></div>
  <div class="task">${CHECK}<div class="body"><h3>Design review with Lina</h3><p>11:30 – 12:00 · Design</p></div><span class="chip">Meeting</span></div>
  <div class="task">${CHECK}<div class="body"><h3>Prepare release notes</h3><p>14:00 · Writing</p></div><span class="chip">Work</span></div>
</div>
<div class="goal"><div class="row"><b>Weekly goal</b><span>72%</span></div><div class="bar"><i></i></div></div>
<div class="fab">+</div>
<div class="tabbar">
  <div class="tab active"><span class="dot"></span>Home</div>
  <div class="tab"><span class="dot" style="border-radius:50%"></span>Insights</div>
  <div class="tab"><span class="dot" style="border-radius:8px"></span>Calendar</div>
  <div class="tab"><span class="dot" style="border-radius:50% 50% 8px 8px"></span>Profile</div>
</div>
</body></html>`;

const insightsHtml = `<!DOCTYPE html><html lang="en" dir="ltr"><head><meta charset="utf-8"><style>
${SHARED}
.header { display: flex; justify-content: space-between; align-items: center; padding: 44px 56px 10px; }
.header h1 { font-size: 56px; font-weight: 700; }
.avatar { width: 92px; height: 92px; border-radius: 50%; background: linear-gradient(135deg, #7C8CF8, #B28DF7); }
.card { margin: 26px 56px 0; background: #131C2E; border: 2px solid rgba(255,255,255,0.05); border-radius: 34px; padding: 40px 44px; }
.bignum { font-size: 120px; font-weight: 700; line-height: 1.05; letter-spacing: -2px; }
.bignum small { font-size: 40px; color: #8A94A8; font-weight: 600; letter-spacing: 0; margin-left: 12px; }
.trend { font-size: 30px; color: #62E6B5; font-weight: 600; margin-top: 6px; }
.chart { display: flex; align-items: flex-end; gap: 26px; height: 300px; margin-top: 44px; }
.chart div { flex: 1; border-radius: 14px 14px 6px 6px; background: rgba(98,230,181,0.25); }
.chart div.hi { background: linear-gradient(180deg, #62E6B5, #2BB783); }
.chart div:nth-child(1) { height: 40%; } .chart div:nth-child(2) { height: 65%; }
.chart div:nth-child(3) { height: 50%; } .chart div:nth-child(4) { height: 85%; }
.chart div:nth-child(5) { height: 58%; } .chart div:nth-child(6) { height: 72%; }
.chart div:nth-child(7) { height: 100%; }
.duo { display: flex; gap: 26px; margin: 26px 56px 0; }
.duo .card { flex: 1; margin: 0; }
.ring { width: 190px; height: 190px; margin: 10px auto 18px; border-radius: 50%;
  background: conic-gradient(#62E6B5 0 78%, rgba(255,255,255,0.09) 78% 100%);
  display: flex; align-items: center; justify-content: center; }
.ring i { width: 140px; height: 140px; border-radius: 50%; background: #131C2E; display: flex;
  align-items: center; justify-content: center; font-style: normal; font-size: 46px; font-weight: 700; }
.cardlabel { text-align: center; font-size: 32px; color: #8A94A8; }
.cardlabel b { color: #E8EDF7; display: block; font-size: 36px; margin-top: 6px; }
.cats { padding: 30px 56px 0; display: flex; flex-direction: column; gap: 30px; }
.cat .row { display: flex; justify-content: space-between; font-size: 34px; margin-bottom: 14px; }
.cat .row span { color: #8A94A8; }
.cat .bar { height: 20px; background: rgba(255,255,255,0.08); border-radius: 999px; overflow: hidden; }
.cat .bar i { display: block; height: 100%; border-radius: 999px; }
</style></head><body>
<div class="statusbar"><span>9:41</span><div class="sb-icons">
  <span class="sb-signal"><i></i><i></i><i></i><i></i></span><span class="sb-battery"></span></div></div>
<div class="header"><h1>Insights</h1><div class="avatar"></div></div>
<div class="card">
  <div class="bignum">18<small>tasks this week</small></div>
  <div class="trend">&#8593; 25% vs last week</div>
  <div class="chart"><div></div><div></div><div></div><div class="hi"></div><div></div><div></div><div class="hi"></div></div>
</div>
<div class="duo">
  <div class="card"><div class="ring"><i>78%</i></div><div class="cardlabel">Goal<b>progress</b></div></div>
  <div class="card"><div class="bignum" style="font-size:96px; margin-top:20px;">12</div><div class="cardlabel" style="text-align:left; margin-top:8px;">Day streak<b>Best: 21</b></div></div>
</div>
<div class="cats">
  <div class="cat"><div class="row"><b>Work</b><span>80%</span></div><div class="bar"><i style="width:80%; background:#62E6B5;"></i></div></div>
  <div class="cat"><div class="row"><b>Personal</b><span>55%</span></div><div class="bar"><i style="width:55%; background:#7C8CF8;"></i></div></div>
  <div class="cat"><div class="row"><b>Study</b><span>30%</span></div><div class="bar"><i style="width:30%; background:#B28DF7;"></i></div></div>
</div>
<div class="tabbar">
  <div class="tab"><span class="dot"></span>Home</div>
  <div class="tab active"><span class="dot" style="border-radius:50%"></span>Insights</div>
  <div class="tab"><span class="dot" style="border-radius:8px"></span>Calendar</div>
  <div class="tab"><span class="dot" style="border-radius:50% 50% 8px 8px"></span>Profile</div>
</div>
</body></html>`;

const composeHtml = `<!DOCTYPE html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><style>
${SHARED}
.sheet { position: absolute; inset: 0; background: rgba(7, 12, 22, 0.55); }
.panel { position: absolute; left: 0; right: 0; bottom: 0; background: #101A2C;
  border-radius: 56px 56px 0 0; padding: 48px 56px 64px; border-top: 2px solid rgba(255,255,255,0.07); }
.grabber { width: 140px; height: 12px; border-radius: 999px; background: rgba(255,255,255,0.16); margin: 0 auto 40px; }
.sheet-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 40px; }
.sheet-head h1 { font-size: 54px; font-weight: 700; }
.close { width: 84px; height: 84px; border-radius: 50%; background: rgba(255,255,255,0.07);
  color: #8A94A8; font-size: 44px; display: flex; align-items: center; justify-content: center; }
.field { background: #0B1220; border: 2px solid rgba(98,230,181,0.5); border-radius: 28px; padding: 36px 38px; }
.field p { font-size: 30px; color: #8A94A8; margin-bottom: 12px; }
.field h2 { font-size: 44px; font-weight: 600; line-height: 1.4; }
.caret { display: inline-block; width: 4px; height: 44px; background: #62E6B5; margin-inline-start: 8px; vertical-align: middle; }
.label { font-size: 32px; font-weight: 600; color: #8A94A8; margin: 44px 0 20px; }
.chips { display: flex; gap: 20px; }
.chips span { font-size: 32px; padding: 18px 34px; border-radius: 999px; background: #0B1220;
  border: 2px solid rgba(255,255,255,0.08); color: #C6CFDF; }
.chips span.on { background: rgba(98,230,181,0.16); border-color: #62E6B5; color: #62E6B5; font-weight: 700; }
.subtask { display: flex; align-items: center; gap: 24px; background: #0B1220; border-radius: 24px;
  padding: 30px 32px; font-size: 34px; color: #8A94A8; }
.plus { width: 48px; height: 48px; border-radius: 14px; background: rgba(255,255,255,0.08);
  display: flex; align-items: center; justify-content: center; font-size: 36px; color: #E8EDF7; flex: none; }
.save { margin-top: 52px; background: #62E6B5; color: #06281B; border-radius: 28px; padding: 38px;
  text-align: center; font-size: 40px; font-weight: 700; }
</style></head><body>
<div class="sheet"></div>
<div class="panel">
  <div class="grabber"></div>
  <div class="sheet-head"><h1>مهمة جديدة</h1><div class="close">&#215;</div></div>
  <div class="field"><p>ما الذي تريد إنجازه؟</p><h2>مراجعة تصميم الواجهة الجديدة<span class="caret"></span></h2></div>
  <div class="label">الأولوية</div>
  <div class="chips"><span class="on">عالية</span><span>متوسطة</span><span>منخفضة</span></div>
  <div class="label">التاريخ</div>
  <div class="chips"><span class="on">اليوم</span><span>غدًا</span><span>لاحقًا</span></div>
  <div class="label">خطوات فرعية</div>
  <div class="subtask"><span class="plus">+</span>إضافة خطوة فرعية</div>
  <div class="save">حفظ المهمة</div>
</div>
</body></html>`;

const screens = [
  { name: "home", html: homeHtml },
  { name: "stats", html: insightsHtml },
  { name: "compose", html: composeHtml },
];

const sandbox = await fs.mkdtemp(path.join(os.tmpdir(), "storeshot-screens-"));
await fs.mkdir(path.join(sandbox, "fonts"), { recursive: true });
for (const file of [
  "IBMPlexSans-Regular.ttf",
  "IBMPlexSans-SemiBold.ttf",
  "IBMPlexSans-Bold.ttf",
  "IBMPlexSansArabic-Regular.ttf",
  "IBMPlexSansArabic-SemiBold.ttf",
  "IBMPlexSansArabic-Bold.ttf",
]) {
  await fs.copyFile(path.join(fontsDir, file), path.join(sandbox, "fonts", file));
}

const browser = await chromium.launch({
  args: ["--allow-file-access-from-files", "--force-color-profile=srgb"],
});
try {
  await fs.mkdir(outDir, { recursive: true });
  for (const screen of screens) {
    const pagePath = path.join(sandbox, `${screen.name}.html`);
    await fs.writeFile(pagePath, screen.html, "utf8");
    const page = await browser.newPage({
      viewport: { width: 1080, height: 2340 },
      deviceScaleFactor: 1,
    });
    await page.goto(pathToFileURL(pagePath).href, { waitUntil: "load" });
    await page.evaluate(async () => {
      await document.fonts.ready;
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    });
    await page.screenshot({ path: path.join(outDir, `${screen.name}.png`), type: "png" });
    await page.close();
    console.log(`wrote starter/screens/${screen.name}.png`);
  }
} finally {
  await browser.close();
  await fs.rm(sandbox, { recursive: true, force: true });
}
