#!/usr/bin/env python3
"""Overflow gate: every screen and overlay at mobile / tablet / desktop."""
import asyncio, sys
from playwright.async_api import async_playwright

URL = "file:///home/user/cardiocore.html"
VIEWPORTS = [("mobile", 390, 844), ("tablet", 768, 1024), ("desktop", 1440, 950)]

SCREENS = [
    ("site",        "CC.go('site')"),
    ("login-patient", "CC.go('login-patient')"),
    ("login-doctor",  "CC.go('login-doctor')"),
    ("onboard",       "CC.onbShow && CC.onbShow(); CC.go('onboard')"),
]

DECOR = ('.blob', '.twin-ring', '.orbit', '.float-card', '.heart-bloom', '.heart-refl',
         '.unlock-rays', '.pulse-ring', '.unlock-trail', '.unlock-orb', '.unlock-hand', '.unlock-target')

async def measure(pg):
    return await pg.evaluate("""async (DECOR) => {
        window.scrollTo(9999, 0);
        const x = window.scrollX;
        window.scrollTo(0, 0);
        const win = window.innerWidth, bad = [];
        const clipped = (el) => {
            let n = el.parentElement;
            while(n && n !== document.body){
                const ox = getComputedStyle(n).overflowX;
                if(ox === 'auto' || ox === 'scroll' || ox === 'hidden' || ox === 'clip') return true;
                if(n.classList.contains('hidden')) return true;
                if(n.classList.contains('side') && !n.classList.contains('open')) return true;
                n = n.parentElement;
            }
            return false;
        };
        for(const e of document.querySelectorAll('body *')){
            const r = e.getBoundingClientRect();
            if(r.width <= 0 || e.offsetParent === null) continue;
            if(r.right <= win + 1 && r.left >= -1) continue;
            const cls = String(e.className);
            if(DECOR.some(d => e.matches(d) || (e.closest && e.closest(d)))) continue;
            if(clipped(e)) continue;
            bad.push(e.tagName + '.' + cls.slice(0, 26));
        }
        return {doc: document.documentElement.scrollWidth, win, x, bad: bad.slice(0, 4)};
    }""", list(DECOR))

async def main():
    fails = []
    async with async_playwright() as p:
        b = await p.chromium.launch(args=["--no-sandbox"])
        for label, w, h in VIEWPORTS:
            ctx = await b.new_context(viewport={"width": w, "height": h})
            pg = await ctx.new_page()
            errs = []
            pg.on("pageerror", lambda e: errs.append(str(e)))
            await pg.goto(URL, wait_until="load")
            await pg.wait_for_timeout(600)
            bad = []
            surfaces = list(SCREENS)
            for sid, js in SCREENS:
                await pg.evaluate(f"() => {{ {js}; }}")
                await pg.wait_for_timeout(320)
                m = await measure(pg)
                if m["x"] > 0 or m["bad"]: bad.append((sid, m))
            # patient + clinician views
            pviews = await pg.evaluate("() => [...document.querySelectorAll('#app-patient .view')].map(v=>v.dataset.view)")
            for v in pviews:
                await pg.evaluate(f"() => CC.goP('{v}')")
                await pg.wait_for_timeout(220)
                m = await measure(pg)
                if m["x"] > 0 or m["bad"]: bad.append(("patient:" + v, m))
            dviews = await pg.evaluate("() => [...document.querySelectorAll('#app-doctor .view')].map(v=>v.dataset.view)")
            for v in dviews:
                await pg.evaluate(f"() => CC.goD('{v}')")
                await pg.wait_for_timeout(220)
                m = await measure(pg)
                if m["x"] > 0 or m["bad"]: bad.append(("doctor:" + v, m))
            # overlays
            overlays = [
                ("palette",   "CC.palette && CC.palette();"),
                ("emergency", "CC.goP('home'); CC.trigger();"),
                ("booking",   "CC.bookModal('video');"),
                ("export",    "CC.exportModal();"),
                ("keys",      "CC.keySheet();"),
                ("unlock-modal", "CC.unlockModal('doctor');"),
                ("unlock-panel", "CC.closeModal(); CC.go('login-patient'); CC.showUnlock('patient');"),
                ("checks",    "CC.hideUnlock('patient'); CC.goP('device'); CC.runChecks();"),
                ("export-csv","CC.exportModal(); CC.selectOption('vitals');"),
                ("day-report","CC.closeModal(); CC.printReport('day');"),
            ]
            for name, js in overlays:
                await pg.evaluate("() => { CC.closeModal(); document.querySelectorAll('.unlock-host').forEach(h=>h.classList.add('hidden')); }")
                await pg.wait_for_timeout(280)
                await pg.evaluate(f"() => {{ {js}; }}")
                await pg.wait_for_timeout(700)
                m = await measure(pg)
                extra = await pg.evaluate("""() => { const m=document.querySelector('.modal');
                    return (m && m.offsetWidth) ? (m.scrollWidth > m.clientWidth + 1 ? m.scrollWidth + '>' + m.clientWidth : 'fits') : 'none'; }""")
                if m["x"] > 0 or m["bad"] or extra not in ("none", "fits"):
                    bad.append(("overlay:" + name, {**m, "modal": extra}))
            if errs: bad.append(("js-errors", errs[:2]))
            names = [b[0] for b in bad]
            print(f"{label}: {'ALL CLEAR' if not bad else 'OVERFLOW ' + str(names[:6])} | js errors: {len(errs)}")
            for item in bad[:6]: print("     ", item[0], item[1])
            fails += [(label, x) for x in bad]
            await ctx.close()
        await b.close()
    return 1 if fails else 0
sys.exit(asyncio.run(main()))
