#!/usr/bin/env python3
"""CardioCore phase 3 verification: physical layer, unlock, emergency, exports."""
import asyncio, sys, json
from playwright.async_api import async_playwright

URL = "file:///home/user/cardiocore.html"
PASS, FAIL = [], []
def chk(name, ok, extra=""):
    (PASS if ok else FAIL).append(name + ((" — " + str(extra)) if extra and not ok else ""))
    print(("  ✓ " if ok else "  ✗ ") + name + (("  [" + str(extra) + "]") if extra and not ok else ""))

async def main():
    errs = []
    async with async_playwright() as p:
        b = await p.chromium.launch(args=["--no-sandbox"])
        ctx = await b.new_context(viewport={"width": 1440, "height": 950})
        pg = await ctx.new_page()
        pg.on("console", lambda m: errs.append(m.text) if m.type == "error" else None)
        pg.on("pageerror", lambda e: errs.append("PAGEERROR: " + str(e)))
        await pg.goto(URL, wait_until="load")
        await pg.wait_for_timeout(700)

        print("\n1 · modules wired")
        api = await pg.evaluate("""() => ({
            fns:['unlockModal','showUnlock','trigger','copyMeet','downloadEmergencyReport','endEmergency',
                 'bookModal','confirmBooking','pickDaySlot','shiftWeek','ics','keySheet','copyText',
                 'exportModal','runChecks','pdfFor','csv','fhir','dayShift','reset','startEcg','printReport',
                 'dayEvents','lighting','magnets','heroTilt','spring'].filter(k=>typeof CC[k]!=='function'),
            sim: typeof Sim, files: typeof Files, emergency: typeof Emergency, booking: typeof Booking })""")
        chk("all CC.* phase-3 functions present", not api["fns"], api["fns"])
        chk("module globals exist", api["sim"] == "object" and api["files"] == "object"
            and api["emergency"] == "object" and api["booking"] == "object")

        print("\n2 · hero light rig")
        rig = await pg.evaluate("""() => {
            const st=document.querySelector('#stage');
            return {bloom:!!st.querySelector('.heart-bloom'), floor:!!st.querySelector('.heart-floor'),
                    refl:!!st.querySelector('.heart-refl'), live:st.classList.contains('live-light'),
                    mags:document.querySelectorAll('[data-magnetic]').length,
                    lit:document.querySelectorAll('.card.lit').length}; }""")
        chk("bloom / floor / reflection mounted", rig["bloom"] and rig["floor"] and rig["refl"], rig)
        chk("magnetic controls registered", rig["mags"] > 20, rig["mags"])
        chk("cards lit (spring tilt + sheen)", rig["lit"] > 8, rig["lit"])
        sb = await pg.evaluate("() => { const r=document.querySelector('#stage').getBoundingClientRect(); return {x:r.x,y:r.y,w:r.width,h:r.height}; }")
        await pg.mouse.move(sb["x"] + sb["w"] * 0.22, sb["y"] + sb["h"] * 0.28)
        await pg.wait_for_timeout(260)
        par = await pg.evaluate("""() => {
            const hr=document.querySelector('#heartImg'), rf=document.querySelector('.heart-refl');
            const t=getComputedStyle(hr).transform, tr=getComputedStyle(rf).transform;
            return {heart:t, refl:tr, op:getComputedStyle(rf).opacity}; }""")
        chk("pointer parallax moves the heart", par["heart"] not in ("none", "matrix(1, 0, 0, 1, 0, 0)"), par["heart"][:40])
        chk("reflection tracks and shows", float(par["op"]) > 0.05, par["op"])

        print("\n3 · gesture unlock")
        await pg.evaluate("() => CC.go('login-patient')")
        await pg.wait_for_timeout(400)
        await pg.click("text=Unlock with the heart gesture")
        await pg.wait_for_timeout(500)
        vis = await pg.evaluate("""() => { const pl=document.querySelector('.unlock-panel[data-ctx=patient]');
            return {vis:!pl.classList.contains('hidden'), w:pl.clientWidth, h:pl.clientHeight,
                    orb:!!pl.querySelector('.unlock-orb'), hand:!!pl.querySelector('.unlock-hand'),
                    ring:!!pl.querySelector('.unlock-ring .unlock-arc'), trail:!!pl.querySelector('.unlock-trail')}; }""")
        chk("panel revealed with orb/hand/ring/trail", vis["vis"] and vis["w"] > 200 and vis["orb"] and vis["hand"] and vis["ring"] and vis["trail"], vis)
        geo = await pg.evaluate("""() => { const pl=document.querySelector('.unlock-panel[data-ctx=patient]').getBoundingClientRect();
            const t=document.querySelector('.unlock-panel[data-ctx=patient] .unlock-target').getBoundingClientRect();
            return {px:pl.x,py:pl.y,tx:t.x+t.width/2,ty:t.y+t.height/2}; }""")
        await pg.mouse.move(geo["px"] + 40, geo["py"] + 40)
        for i in range(1, 26):
            await pg.mouse.move(geo["px"] + 40 + (geo["tx"] - geo["px"] - 40) * i / 25,
                               geo["py"] + 40 + (geo["ty"] - geo["py"] - 40) * i / 25)
            await pg.wait_for_timeout(16)
        mid = await pg.evaluate("""() => { const orb=document.querySelector('.unlock-panel[data-ctx=patient] .unlock-orb');
            const hand=document.querySelector('.unlock-panel[data-ctx=patient] .unlock-hand');
            return {orb:orb.style.transform, hand:hand.style.transform, trail:orb.style.getPropertyValue('--sl')}; }""")
        chk("orb and hand are separately sprung (paired physics)",
            "translate3d" in mid["orb"] and "translate3d" in mid["hand"] and mid["orb"] != mid["hand"])
        chk("weight coupling drives the shadow", mid["trail"] != "", mid)
        await pg.mouse.move(geo["tx"] + 3, geo["ty"] + 3)
        await pg.wait_for_timeout(3400)
        done = await pg.evaluate("""() => ({cls:document.querySelector('.unlock-panel[data-ctx=patient]').className,
            app:(document.body.dataset.screen||'')==='app-patient', toast:document.querySelector('#toasts').innerText.trim().slice(0,60)})""")
        chk("hold-in-ring completes the unlock", "unlocked" in done["cls"], done["cls"])
        await pg.wait_for_timeout(1600)
        scr = await pg.evaluate("() => document.body.dataset.screen || ''")
        chk("unlock signs the patient in", scr in ("app-patient", "onboard"), scr)
        if scr == "onboard":
            await pg.evaluate("() => { CC.onbFinish ? CC.onbFinish(true) : CC.skipOnboarding(); }")
            await pg.wait_for_timeout(600)
        await pg.evaluate("() => { CC.goP('live'); }")
        await pg.wait_for_timeout(300)

        print("\n4 · device bench (simulator)")
        await pg.evaluate("() => CC.goP('live')")
        await pg.wait_for_timeout(1200)
        hr1 = await pg.inner_text("#simHR")
        grid = await pg.evaluate("() => document.querySelectorAll('#simScenarios .tab').length")
        chk("scenario tabs present", grid == 6, grid)
        await pg.click("#simScenarios .tab[data-scn=arrhythmia]")
        live = await pg.evaluate("() => ({log:document.querySelectorAll('#simLog .ev').length, note:document.querySelector('#simNote').innerText.slice(0,30)})")
        chk("scenario switch logs to the bench", live["log"] >= 3, live)
        await pg.wait_for_timeout(10000)
        ur = await pg.evaluate("""() => ({card:getComputedStyle(document.querySelector('#simUrgentCard')).display,
            gates:[...document.querySelectorAll('#gateQuality,#gateMotion,#gatePersist,#gateMulti')].map(e=>e.innerText.trim()),
            hr:document.querySelector('#simHR').innerText, log:document.querySelectorAll('#simLog .ev').length})""")
        chk("urgent card reveals after persistence gate", ur["card"] != "none", ur)
        chk("gates report state", all(ur["gates"]), ur["gates"])
        chk("HR rose toward the arrhythmia target", int(ur["hr"]) > 110, ur["hr"])
        await pg.evaluate("() => document.querySelector('#simApply').click()")
        await pg.wait_for_timeout(1600)
        driven = await pg.evaluate("() => ({hr:document.querySelector('#vHR').innerText, chip:document.querySelector('#vHRChip').innerText.trim(), twin:document.querySelector('#twinIndex').innerText})")
        chk("simulator drives Home vitals + twin index", driven["hr"] != "68" and driven["chip"] != "Stable", driven)
        await pg.evaluate("() => document.querySelector('#simApply').click()")
        await pg.evaluate("() => CC.reset()")
        await pg.wait_for_timeout(700)

        print("\n5 · day in review")
        await pg.evaluate("() => CC.goP('day')")
        await pg.wait_for_timeout(700)
        day = await pg.evaluate("""() => { const cv=document.querySelector('canvas[data-chart=day]');
            const ctx=cv.getContext('2d'); const d=ctx.getImageData(0,0,cv.width,cv.height).data;
            let ink=0; for(let i=3;i<d.length;i+=4*97) if(d[i]>8) ink++;
            return {rows:document.querySelectorAll('#dayEvents .lrow').length, label:document.querySelector('#dayLabel').innerText,
                    ink:ink, painted:!!cv.dataset.painted}; }""")
        chk("24-hour chart renders", day["ink"] > 20, day)
        chk("event timeline populated", day["rows"] >= 6, day["rows"])
        chk("day label set", "2026" in day["label"], day["label"])
        await pg.evaluate("() => CC.dayShift(1)")
        await pg.wait_for_timeout(400)
        chk("day shift moves the date", await pg.inner_text("#dayLabel") != day["label"])
        await pg.evaluate("() => CC.dayShift(-1)")

        print("\n6 · emergency response")
        await pg.evaluate("() => CC.trigger()")
        await pg.wait_for_timeout(900)
        first = await pg.evaluate("""() => ({meet:(Emergency.session()||{}).meet||'', steps:document.querySelectorAll('.emg-step').length})""")
        chk("Meet link exists immediately", first["meet"].startswith("https://meet.google.com/"), first["meet"])
        chk("all response steps listed", first["steps"] == 7, first["steps"])
        await pg.wait_for_timeout(4200)
        res = await pg.evaluate("""() => { const s=Emergency.session();
            return {done:document.querySelectorAll('.emg-step.done').length, report:s.report, shared:s.shared.length,
                    pdf:(CC._emgPdf||{}).data ? CC._emgPdf.data.slice(0,8) : '',
                    size:((CC._emgPdf||{}).data||'').length, text:document.querySelector('#emgResult').innerText.slice(0,600)}; }""")
        folded = await pg.evaluate("() => !!document.querySelector('.emg-fold')")
        chk("every step completed (steps fold into one summary)", res["done"] == 7 or folded, (res["done"], folded))
        chk("report compiled + attached to session", res["report"] and res["report"]["name"].endswith(".pdf"), res["report"])
        chk("report shared to the clinician", res["shared"] == 1, res["shared"])
        chk("PDF is a real PDF document", res["pdf"].startswith("%PDF"), res["pdf"])
        chk("PDF has substance", res["size"] > 6000, res["size"])
        chk("result panel shows link + report", "meet.google.com" in res["text"] and "PDF" in res["text"], res["text"])
        await pg.evaluate("() => CC.copyMeet()")
        await pg.wait_for_timeout(300)
        dl = await pg.evaluate("""() => { try { CC.downloadEmergencyReport(); return 'ok'; } catch(e){ return 'throw: '+e.message; } }""")
        chk("download call is safe in a sandboxed frame", dl == "ok", dl)
        await pg.click("text=Minimise")
        await pg.wait_for_timeout(400)
        ban = await pg.evaluate("""() => { const b=document.querySelector('#emgBanner');
            return {vis:!b.classList.contains('hidden'), txt:b.innerText.slice(0,50)}; }""")
        chk("persistent emergency banner", ban["vis"], ban)

        print("\n7 · booking week calendar")
        await pg.evaluate("() => CC.bookModal('video')")
        await pg.wait_for_timeout(600)
        bk = await pg.evaluate("""() => ({cols:document.querySelectorAll('#bkWk .hcell').length,
            slots:document.querySelectorAll('#bkWk .slot').length,
            busy:document.querySelectorAll('#bkWk .slot.busy').length,
            urgent:document.querySelectorAll('#bkWk .slot.urgent').length,
            label:document.querySelector('#bkWkLabel').innerText})""")
        chk("week grid: 7 days × 6 slots", bk["cols"] == 8 and bk["slots"] == 42, bk)
        chk("booked + urgent slots shown", bk["busy"] > 4 and bk["urgent"] >= 1, bk)
        lbl = bk["label"]
        await pg.evaluate("() => CC.shiftWeek(1)")
        await pg.wait_for_timeout(300)
        chk("week navigation updates the range", await pg.inner_text("#bkWkLabel") != lbl)
        await pg.evaluate("() => CC.shiftWeek(-1)")
        await pg.evaluate("() => CC.pickDaySlot(document.querySelectorAll('#bkWk .slot')[9], 1, 1)")
        await pg.wait_for_timeout(200)
        picked = await pg.inner_text("#bkPicked")
        chk("slot selection echoes back", "Oct" in picked, picked)
        await pg.evaluate("() => CC.confirmBooking()")
        await pg.wait_for_timeout(800)
        conf = await pg.evaluate("""() => ({txt:document.querySelector('#modal').innerText, meet:(document.querySelector('#modal').innerText.match(/meet\\.google\\.com\\/[a-z-]+/)||[''])[0]})""")
        chk("video consult yields a Meet room", conf["meet"].startswith("meet.google.com"), conf["meet"])
        ics = await pg.evaluate("""() => { try { CC.ics('20261006','10:30','Dr Neha Raghavan','','CC-1'); return 'ok'; } catch(e){ return 'throw: '+e.message; } }""")
        chk("calendar file builds", ics == "ok", ics)

        print("\n8 · exports + diagnostics + shortcuts")
        await pg.evaluate("() => { CC.closeModal(); CC.exportModal(); }")
        await pg.wait_for_timeout(600)
        ex = await pg.evaluate("""() => ({opts:document.querySelectorAll('.optrow').length,
            prev:!!document.querySelector('#expPreview'), txt:document.querySelector('#expBody').innerText.slice(0,40)})""")
        chk("export modal lists formats", ex["opts"] >= 6, ex)
        body = await pg.inner_text("#expBody")
        chk("preview pane renders a report", "PDF · 2 pages" in body and "HEALTH RECORD SUMMARY" in body.upper(), body[:60])
        payloads = await pg.evaluate("""() => { const out={};
            ['emergency','record','day','lipids'].forEach(k=>{ const f=Files.pdfFor(k); out[k]=[f.name, f.data.length, f.data.startsWith('%PDF')]; });
            out.csv = Files.csv('vitals').data.split('\\n').length;
            const fb = JSON.parse(Files.fhir().data); out.fhir = [fb.resourceType, fb.entry.length];
            return out; }""")
        pdfk = {k:v for k,v in payloads.items() if k in ('emergency','record','day','lipids')}
        chk("4 report builders produce PDFs", len(pdfk) == 4 and all(v[2] and v[1] > 3000 for v in pdfk.values()), pdfk)
        chk("CSV + FHIR bundle build", payloads["csv"] > 10 and payloads["fhir"][0] == "Bundle", payloads)
        await pg.evaluate("() => { CC.closeModal(); CC.runChecks(); }")
        await pg.wait_for_timeout(6000)
        diag = await pg.evaluate("""() => ({rows:(CC._diagResults||[]).length,
            fail:(CC._diagResults||[]).filter(r=>!r.ok).length, txt:document.querySelector('#modal').innerText.slice(0,70),
            warns:(CC._diagResults||[]).filter(r=>!r.ok).map(r=>r.label+' → '+r.value)})""")
        chk("diagnostics ran all checks", diag["rows"] >= 10, diag)
        fb = [w for w in diag["warns"] if "Frame budget" in w]
        chk("no diagnostic failures (frame-budget note allowed in headless)",
            diag["fail"] == 0 or (diag["fail"] == len(fb) and fb), diag["warns"])
        await pg.evaluate("() => CC.closeModal()")
        await pg.evaluate("() => CC.keySheet()")
        await pg.wait_for_timeout(400)
        ks = await pg.evaluate("() => document.querySelectorAll('.keys div').length")
        chk("shortcut sheet lists keys", ks >= 12, ks)
        await pg.evaluate("() => CC.closeModal()")

        print("\n9 · reduced motion")
        ctx2 = await b.new_context(viewport={"width": 1440, "height": 950}, reduced_motion="reduce")
        pg2 = await ctx2.new_page()
        e2 = []
        pg2.on("pageerror", lambda e: e2.append(str(e)))
        await pg2.goto(URL, wait_until="load")
        await pg2.wait_for_timeout(500)
        await pg2.evaluate("() => CC.go('login-patient')")
        await pg2.click("text=Unlock with the heart gesture")
        await pg2.wait_for_timeout(500)
        rm = await pg2.evaluate("""() => { const pl=document.querySelector('.unlock-panel[data-ctx=patient]');
            return {hint:pl.querySelector('.unlock-hint').innerText, cursor:getComputedStyle(pl).cursor,
                    live:document.querySelector('#stage').classList.contains('live-light'),
                    mags:document.querySelectorAll('[data-magnetic]').length}; }""")
        chk("reduced motion: click-to-unlock fallback", "click" in rm["hint"].lower(), rm)
        chk("reduced motion: parallax off, no magnets", rm["live"] is False and rm["mags"] == 0, rm)
        await pg2.click(".unlock-panel[data-ctx=patient]")
        await pg2.wait_for_timeout(2800)
        chk("click fallback still signs in", await pg2.evaluate("() => ['app-patient','onboard'].includes(document.body.dataset.screen)"))
        chk("no page errors under reduced motion", not e2, e2)

        print("\n10 · no console errors")
        chk("console clean", not errs, errs[:5])
        await b.close()

    print(f"\n{'='*58}\n  {len(PASS)} passed · {len(FAIL)} failed")
    if FAIL:
        for f in FAIL: print("   ✗ " + f)
    print("="*58)
    return 1 if FAIL else 0

sys.exit(asyncio.run(main()))
