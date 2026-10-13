#!/usr/bin/env python3
"""Dark-mode audit: find text that cannot be read against what is behind it."""
import asyncio, sys, json
from playwright.async_api import async_playwright

URL = "file:///home/user/cardiocore.html"

PROBE = """() => {
  const lum = (r, g, b) => {
    const f = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
  };
  const parse = c => { const m = c.match(/[\\d.]+/g); return m ? m.slice(0,3).map(Number).concat(m[3] !== undefined ? +m[3] : 1) : null; };
  const ratio = (a, b) => { const l1 = lum(...a), l2 = lum(...b); return (Math.max(l1,l2) + 0.05) / (Math.min(l1,l2) + 0.05); };
  const bgOf = el => {
    let n = el;
    while(n && n !== document.documentElement){
      const cs = getComputedStyle(n);
      if(cs.backgroundImage && cs.backgroundImage !== 'none') return 'gradient';
      const bg = parse(cs.backgroundColor);
      if(bg && bg[3] > 0.55) return bg;
      n = n.parentElement;
    }
    const b2 = parse(getComputedStyle(document.body).backgroundColor);
    return b2 || [255,255,255,1];
  };
  const out = [];
  for(const el of document.querySelectorAll('body *')){
    const r = el.getBoundingClientRect();
    if(r.width < 4 || r.height < 4 || el.offsetParent === null) continue;
    const cs = getComputedStyle(el);
    if(cs.visibility === 'hidden' || +cs.opacity < 0.12) continue;
    const hasText = [...el.childNodes].some(n => n.nodeType === 3 && n.nodeValue.trim().length > 1);
    const isField = /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName);
    if(!hasText && !isField) continue;
    const fg = parse(cs.color); if(!fg) continue;
    const bg = bgOf(el);
    if(bg === 'gradient') continue;
    const cr = ratio(fg, bg);
    if(cr < 3.0){
      out.push({ sel: el.tagName.toLowerCase() + (el.className && typeof el.className === 'string' ? '.' + el.className.trim().split(/\\s+/).slice(0,2).join('.') : ''),
                 text: (el.innerText || '').trim().slice(0, 34).replace(/\\n/g, ' '),
                 cr: +cr.toFixed(2), fg: cs.color, bg: `rgb(${bg.slice(0,3).map(Math.round).join(',')})` });
    }
  }
  const seen = new Set();
  return out.filter(o => { const k = o.sel + o.cr; if(seen.has(k)) return false; seen.add(k); return true; }).slice(0, 40);
}"""

SURFACES = [
    ("site",     "CC.go('site')"),
    ("about",    "CC.go('about')"),
    ("auth",     "CC.go('login-patient')"),
    ("onboard",  "CC.onbShow && CC.onbShow(); CC.go('onboard')"),
    ("p:home",   "CC.goP('home')"),
    ("p:health", "CC.goP('health')"),
    ("p:ecg",    "CC.goP('ecg')"),
    ("p:live",   "CC.goP('live')"),
    ("p:day",    "CC.goP('day')"),
    ("p:twin",   "CC.goP('twin')"),
    ("p:alerts", "CC.goP('alerts')"),
    ("p:msgs",   "CC.goP('messages')"),
    ("p:lipids", "CC.goP('lipids')"),
    ("p:device", "CC.goP('device')"),
    ("p:profile","CC.goP('profile')"),
    ("d:roster", "CC.goD('roster')"),
    ("d:msgs",   "CC.goD('messages')"),
    ("d:review", "CC.goD('review')"),
    ("d:handover","CC.goD('handover')"),
    ("m:emergency", "CC.trigger()"),
    ("m:booking",   "CC.closeModal(); CC.bookModal('video')"),
    ("m:export",    "CC.closeModal(); CC.exportModal()"),
    ("m:keys",      "CC.closeModal(); CC.keySheet()"),
    ("m:viewer",    "CC.closeModal(); CC.viewer('record.pdf','application/pdf','x', Files.pdfFor('record').spec)"),
    ("m:unlock",    "CC.closeModal(); CC.unlockModal('doctor')"),
]

async def main():
    only = sys.argv[1] if len(sys.argv) > 1 else None
    total = 0
    async with async_playwright() as p:
        b = await p.chromium.launch(args=["--no-sandbox"])
        ctx = await b.new_context(viewport={"width": 1440, "height": 950})
        pg = await ctx.new_page()
        await pg.goto(URL, wait_until="load")
        await pg.wait_for_timeout(700)
        await pg.evaluate("() => { CC.applyTheme('dark'); CC.skipOnboarding(); }")
        await pg.wait_for_timeout(500)
        for name, js in SURFACES:
            if only and only not in name: continue
            await pg.evaluate("() => { CC.closeModal(); document.querySelectorAll('.unlock-host').forEach(h => h.classList.add('hidden')); }")
            await pg.wait_for_timeout(200)
            await pg.evaluate(f"() => {{ {js}; }}")
            await pg.wait_for_timeout(700)
            found = await pg.evaluate(PROBE)
            total += len(found)
            if found:
                print(f"\n{name}: {len(found)} low-contrast")
                for f in found[:8]:
                    print(f"   {f['cr']:>5} : {f['sel']:<34} {f['fg']:<22} on {f['bg']:<20} “{f['text']}”")
            else:
                print(f"{name}: ok")
        await b.close()
    print(f"\nlow-contrast findings: {total}")
    return 0 if total == 0 else 1
sys.exit(asyncio.run(main()))
