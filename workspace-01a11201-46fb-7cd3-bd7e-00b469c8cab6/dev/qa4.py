#!/usr/bin/env python3
"""Phase 4 verification: About page, trim, units, charts, messaging, downloads."""
import asyncio, sys
from playwright.async_api import async_playwright

URL = "file:///home/user/cardiocore.html"
PASS, FAIL = [], []
def chk(n, ok, x=""):
    (PASS if ok else FAIL).append(n + (f" — {x}" if x and not ok else ""))
    print(("  ✓ " if ok else "  ✗ ") + n + (f"  [{x}]" if x and not ok else ""))

async def main():
    errs = []
    async with async_playwright() as p:
        b = await p.chromium.launch(args=["--no-sandbox"])
        ctx = await b.new_context(viewport={"width": 1440, "height": 950}, accept_downloads=True)
        pg = await ctx.new_page()
        pg.on("pageerror", lambda e: errs.append(str(e)))
        pg.on("console", lambda m: errs.append("c:" + m.text) if m.type == "error" else None)
        await pg.goto(URL, wait_until="load"); await pg.wait_for_timeout(900)

        print("\n1 · landing page slimmed, About page added")
        hero = await pg.evaluate("""() => { const s=document.querySelector('#site');
            const ids=[...document.querySelectorAll('#site section')].map(x=>x.id).filter(Boolean);
            return {height:s.getBoundingClientRect().height, ids,
                    iso:document.body.innerText.includes('ISO 27001'), aboutLink:!!document.querySelector('[data-go=about]')}; }""")
        chk("deep sections moved off the landing page", "twin" not in hero["ids"] and "platform" not in hero["ids"], hero["ids"])
        chk("landing page is much shorter", hero["height"] < 7000, hero["height"])
        chk("ISO 27001 claim removed", hero["iso"] is False)
        await pg.evaluate("() => CC.go('about')"); await pg.wait_for_timeout(900)
        about = await pg.evaluate("""() => { const a=document.querySelector('#about');
            return {on:document.body.dataset.screen==='about', h:a.getBoundingClientRect().height,
                    imgs:[...a.querySelectorAll('img')].length,
                    loaded:[...a.querySelectorAll('img')].every(i=>i.complete && i.naturalWidth>0),
                    benefits:a.querySelectorAll('.ab-benefits li').length, chapters:a.querySelectorAll('.ab-chapter').length,
                    quote:!!a.querySelector('.ab-quote'), chips:a.querySelectorAll('.ab-watch .chip').length,
                    cta:[...a.querySelectorAll('button')].filter(x=>/sign in/i.test(x.innerText)).length}; }""")
        chk("about screen routes and renders", about["on"] and about["h"] > 3000, about)
        chk("about has visuals (3 photographs, all decoded)", about["imgs"] == 3 and about["loaded"], about)
        chk("about is structured like the reference: benefits + chapters + quote + treat-list + CTA",
            about["benefits"] == 4 and about["chapters"] == 4 and about["quote"] and about["chips"] >= 8 and about["cta"] >= 2, about)
        back = await pg.evaluate("""() => { document.querySelector('#about [data-go="home"]').click(); return document.body.dataset.screen; }""")
        chk("about links back to the site", back == "site", back)

        print("\n2 · SI units")
        await pg.evaluate("() => CC.goP('home')"); await pg.wait_for_timeout(700)
        si = await pg.evaluate("""() => ({hr:document.querySelector('#vHR').textContent + document.querySelector('#vHR').nextElementSibling.textContent,
            chips:document.querySelectorAll('#unitChips button').length})""")
        chk("heart rate shows SI min⁻¹", "min⁻¹" in si["hr"], si)
        chk("unit switch present in both topbars", si["chips"] == 2, si)
        await pg.evaluate("() => CC.setUnits('conv')"); await pg.wait_for_timeout(500)
        conv = await pg.evaluate("""() => ({temp:document.querySelector('#vTemp').textContent + document.querySelector('#vTemp').nextElementSibling.textContent,
            hr:document.querySelector('#vHR').textContent + document.querySelector('#vHR').nextElementSibling.textContent})""")
        chk("conventional mode converts °C → °F", "97.9" in conv["temp"] and "°F" in conv["temp"], conv)
        await pg.evaluate("() => CC.setUnits('si')"); await pg.wait_for_timeout(400)
        backsi = await pg.evaluate("() => document.querySelector('#vTemp').textContent + document.querySelector('#vTemp').nextElementSibling.textContent")
        chk("switching back restores SI losslessly", "36.6" in backsi and "°C" in backsi, backsi)

        print("\n3 · interactive charts")
        await pg.wait_for_timeout(900)
        layers = await pg.evaluate("""() => { const cv=document.querySelector('.vital canvas[data-chart]');
            return {under:!!cv.parentElement._under, over:!!cv.parentElement._over, reveal:cv._reveal}; }""")
        chk("charts get an envelope underlay + interaction overlay", layers["under"] and layers["over"], layers)
        chk("draw-in animation ran", layers["reveal"] is None or layers["reveal"] >= 1, layers)
        box = await pg.evaluate("""() => { const cv=document.querySelector('.vital canvas[data-chart]'); const r=cv.getBoundingClientRect();
            return {x:r.x,y:r.y,w:r.width,h:r.height}; }""")
        await pg.mouse.move(box["x"] + box["w"] * 0.55, box["y"] + box["h"] / 2); await pg.wait_for_timeout(400)
        tip = await pg.evaluate("""() => { const t=[...document.querySelectorAll('.chart-tip')].find(x=>x.classList.contains('on'));
            return t ? t.innerText.replace(/\\n/g,' | ') : ''; }""")
        chk("hovering shows a live readout with units", "min⁻¹" in tip, tip)
        await pg.mouse.click(box["x"] + box["w"] * 0.55, box["y"] + box["h"] / 2); await pg.wait_for_timeout(300)
        pins = await pg.evaluate("() => CC.pinsOf('hrSpark').length")
        chk("clicking pins a reading", pins == 1, pins)
        # zoom via shift-drag on the trends chart
        await pg.evaluate("() => CC.goP('health')"); await pg.wait_for_timeout(900)
        tb = await pg.evaluate("""() => { const cv=document.querySelector('canvas[data-chart=hrTrend]'); if(!cv) return null;
            cv.scrollIntoView({block:'center'});
            const r=cv.getBoundingClientRect(); return {x:r.x,y:r.y,w:r.width,h:r.height}; }""")
        if tb:
            await pg.keyboard.down("Shift")
            await pg.mouse.move(tb["x"] + tb["w"] * 0.2, tb["y"] + tb["h"] / 2)
            await pg.mouse.down(); await pg.mouse.move(tb["x"] + tb["w"] * 0.75, tb["y"] + tb["h"] / 2, steps=12)
            await pg.mouse.up(); await pg.keyboard.up("Shift")
            await pg.wait_for_timeout(700)
            z = await pg.evaluate("() => ({zoom:CC.zoomOf('hrTrend'), bar:!!document.querySelector('.zoombar')})")
            chk("shift-drag zooms into a window", bool(z["zoom"]) and z["bar"], z)
            await pg.evaluate("() => CC.resetZoom('hrTrend')"); await pg.wait_for_timeout(400)
            z2 = await pg.evaluate("() => CC.zoomOf('hrTrend')")
            chk("reset returns the full series", z2 is None, z2)

        print("\n4 · messaging, both directions, live")
        await pg.evaluate("() => CC.goP('messages')"); await pg.wait_for_timeout(900)
        seed = await pg.evaluate("""() => ({threads:document.querySelectorAll('#patMsgThreads .msgthread').length,
            bubbles:document.querySelectorAll('#patMsgs .bubble').length})""")
        chk("patient thread list + conversation render", seed["threads"] == 3 and seed["bubbles"] >= 4, seed)
        await pg.fill("#patMsgIn", "Patient asks a new question about the palpitations.")
        await pg.click("#patMsgs >> text=Send"); await pg.wait_for_timeout(300)
        sent = await pg.evaluate("""() => ({mine:[...document.querySelectorAll('#patMsgs .bubble.mine')].pop()?.innerText.slice(0,44),
            typed:!!document.querySelector('#patMsgs .bubble.typing')})""")
        chk("patient message lands instantly, with a typing indicator", "Patient asks" in sent["mine"], sent)
        await pg.wait_for_timeout(3600)
        replied = await pg.evaluate("""() => ({n:document.querySelectorAll('#patMsgs .bubble').length,
            last:[...document.querySelectorAll('#patMsgs .bubble')].pop()?.innerText.slice(0,40)})""")
        chk("the clinician answers automatically", replied["n"] >= 6 and "You" not in replied["last"], replied)
        await pg.evaluate("() => CC.goD('messages')"); await pg.wait_for_timeout(900)
        doc = await pg.evaluate("""() => ({bubbles:document.querySelectorAll('#docMsgs .bubble').length,
            hasPatientMsg:[...document.querySelectorAll('#docMsgs .bubble')].some(b=>/Patient asks a new question/.test(b.innerText)),
            unread:document.querySelector('#docUnreadTxt').textContent})""")
        chk("what the patient wrote shows up in the clinician portal", doc["hasPatientMsg"], doc)
        chk("unread badge counts inbound messages", "1 unread" in doc["unread"], doc["unread"])
        await pg.fill("#docMsgIn", "Clinician replies from the other side.")
        await pg.click("#docMsgs >> text=Send"); await pg.wait_for_timeout(3600)
        mirror = await pg.evaluate("""() => { CC.goP('messages');
            return [...document.querySelectorAll('#patMsgs .bubble')].some(b=>/Clinician replies from the other side/.test(b.innerText)); }""")
        chk("clinician reply appears in the patient interface", mirror)
        badge = await pg.evaluate("""() => { CC.goD('roster'); return {nav:document.querySelector('#msgBadgeDoc').textContent}; }""")
        chk("unread badge is live on the nav", badge["nav"].isdigit(), badge)

        print("\n5 · reports actually download")
        dl = []
        pg.on("download", lambda d: dl.append(d.suggested_filename))
        await pg.evaluate("""() => { CC.goP('home'); CC.trigger(); }""")
        await pg.wait_for_timeout(5300)
        await pg.click("#emgResult >> text=Download PDF")
        await pg.wait_for_timeout(900)
        chk("emergency report downloads a real file", any(f.endswith(".pdf") for f in dl), dl)
        await pg.evaluate("() => CC.closeModal()")
        await pg.evaluate("() => CC.exportModal()"); await pg.wait_for_timeout(600)
        await pg.click("#modal .btn:not(.ghost) >> text=Download")
        await pg.wait_for_timeout(900)
        chk("export modal downloads too", len(dl) >= 2, dl)
        await pg.evaluate("() => { CC.closeModal(); const f = Files.pdfFor('emergency'); CC.viewer(f.name, f.mime, f.data, f.spec); }")
        await pg.wait_for_timeout(800)
        vw = await pg.evaluate("""() => { const v=document.querySelector('#viewerBody');
            return {tables:v.querySelectorAll('.vtbl').length, ecg:!!v.querySelector('.vecg'), rows:v.querySelectorAll('.vrows div').length,
                    print:!!document.querySelector('#modal .btn.dark'), text:v.innerText.slice(0,60)}; }""")
        chk("in-app viewer renders the report (tables, ECG, print)", vw["tables"] >= 1 and vw["ecg"] and vw["print"], vw)
        await pg.evaluate("() => CC.closeModal()")

        print("\n6 · nothing regressed")
        await pg.evaluate("() => { CC.applyTheme('light'); CC.go('site'); }"); await pg.wait_for_timeout(500)
        live = await pg.evaluate("""() => ({strip:document.querySelectorAll('.demotile').length,
            reveal:typeof CC.animateView, msgs:typeof CC.sendMsg, units:typeof CC.setUnits})""")
        chk("physics layer intact", live["strip"] == 4 and live["reveal"] == "function", live)
        chk("console clean", not errs, errs[:4])
        await b.close()
    print(f"\n{'='*56}\n  {len(PASS)} passed · {len(FAIL)} failed")
    for f in FAIL: print("   ✗ " + f)
    print("="*56)
    return 1 if FAIL else 0
sys.exit(asyncio.run(main()))
