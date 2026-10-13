#!/usr/bin/env python3
"""Phase-3 screenshots: physical layer, unlock, bench, day, emergency, exports."""
import asyncio, os
from playwright.async_api import async_playwright

URL = "file:///home/user/cardiocore.html"
OUT = "/home/user/dev/shots"
LB = {"width": 1440, "height": 950}

async def shot(b, name, fn, vp=LB, reduced=None, full=False, dsf=1):
    ctx = await b.new_context(viewport=vp, device_scale_factor=dsf, reduced_motion=reduced)
    pg = await ctx.new_page()
    errs = []
    pg.on("pageerror", lambda e: errs.append(str(e)))
    await pg.goto(URL, wait_until="load")
    await pg.wait_for_timeout(700)
    await fn(pg)
    await pg.wait_for_timeout(500)
    await pg.screenshot(path=f"{OUT}/{name}.png", full_page=full)
    await ctx.close()
    print(("  ✓ " if not errs else "  ! ") + name + ("" if not errs else "  " + str(errs[:1])))

async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(args=["--no-sandbox"])

        async def hero(pg):
            await pg.evaluate("() => CC.go('site')")
            await pg.mouse.move(980, 330); await pg.wait_for_timeout(700)
            await pg.mouse.move(1100, 420); await pg.wait_for_timeout(700)
        await shot(b, "p3-hero-light", hero)

        async def hero_dark(pg):
            await pg.click("[data-theme-toggle], .theme-toggle") if await pg.query_selector("[data-theme-toggle]") else await pg.evaluate("() => CC.toggleTheme()")
            await pg.evaluate("() => CC.go('site')")
            await pg.mouse.move(1020, 360); await pg.wait_for_timeout(800)
        await shot(b, "p3-hero-dark", hero_dark)

        async def unlock(pg):
            await pg.evaluate("() => CC.go('login-patient')")
            await pg.wait_for_timeout(300)
            await pg.click("text=Unlock with the heart gesture")
            await pg.wait_for_timeout(600)
            g = await pg.evaluate("""() => { const pl=document.querySelector('.unlock-panel[data-ctx=patient]').getBoundingClientRect();
                const t=document.querySelector('.unlock-panel[data-ctx=patient] .unlock-target').getBoundingClientRect();
                return {px:pl.x,py:pl.y,tx:t.x+t.width/2,ty:t.y+t.height/2}; }""")
            await pg.mouse.move(g["px"]+50, g["py"]+60)
            for i in range(1, 12):
                await pg.mouse.move(g["px"]+50+(g["tx"]-g["px"]-30)*i/16, g["py"]+60+(g["ty"]-g["py"]-10)*i/16)
                await pg.wait_for_timeout(28)
            await pg.wait_for_timeout(520)
        await shot(b, "p3-unlock-desktop", unlock)
        await shot(b, "p3-unlock-mobile", unlock, vp={"width": 390, "height": 844})

        async def unlock_dark(pg):
            await pg.evaluate("() => { CC.applyTheme('dark'); CC.go('login-patient'); }")
            await pg.wait_for_timeout(300)
            await pg.click("text=Unlock with the heart gesture")
            await pg.wait_for_timeout(900)
        await shot(b, "p3-unlock-dark", unlock_dark)

        async def live(pg):
            await pg.evaluate("() => { CC.skipOnboarding(); CC.goP('live'); }")
            await pg.wait_for_timeout(400)
            await pg.click("#simScenarios .tab[data-scn=arrhythmia]")
            await pg.wait_for_timeout(10000)
        await shot(b, "p3-bench-arrhythmia", live)
        await shot(b, "p3-bench-mobile", live, vp={"width": 390, "height": 844}, full=True)

        async def day(pg):
            await pg.evaluate("() => { CC.skipOnboarding(); CC.goP('day'); }")
            await pg.wait_for_timeout(900)
        await shot(b, "p3-day-review", day)
        await shot(b, "p3-day-mobile", day, vp={"width": 390, "height": 844}, full=True)

        async def emergency(pg):
            await pg.evaluate("() => { CC.skipOnboarding(); CC.goP('home'); CC.trigger(); }")
            await pg.wait_for_timeout(5200)
            await pg.screenshot(path=f"{OUT}/p3-emergency.png")
            await pg.click("text=Minimise")
            await pg.wait_for_timeout(400)
            await pg.evaluate("() => CC.goP('home')")
            await pg.wait_for_timeout(700)
        await shot(b, "p3-emergency-banner", emergency)

        async def booking(pg):
            await pg.evaluate("() => { CC.skipOnboarding(); CC.goP('home'); CC.bookModal('video'); }")
            await pg.wait_for_timeout(700)
        await shot(b, "p3-booking-week", booking)

        async def expo(pg):
            await pg.evaluate("() => { CC.skipOnboarding(); CC.goP('device'); CC.exportModal(); }")
            await pg.wait_for_timeout(800)
        await shot(b, "p3-export", expo)

        async def checks(pg):
            await pg.evaluate("() => { CC.skipOnboarding(); CC.goP('device'); CC.runChecks(); }")
            await pg.wait_for_timeout(6500)
        await shot(b, "p3-checks", checks)

        async def keys(pg):
            await pg.evaluate("() => { CC.skipOnboarding(); CC.goP('home'); CC.keySheet(); }")
            await pg.wait_for_timeout(500)
        await shot(b, "p3-shortcuts", keys)

        # overflow: every new surface must fit 390
        print("\n  overflow at 390 (new surfaces)")
        ctx = await b.new_context(viewport={"width": 390, "height": 844})
        pg = await ctx.new_page()
        await pg.goto(URL, wait_until="load"); await pg.wait_for_timeout(600)
        await pg.evaluate("() => { CC.skipOnboarding(); }")
        for label, js in [
            ("unlock panel", "CC.go('login-patient'); CC.showUnlock('patient')"),
            ("unlock modal", "CC.unlockModal('doctor')"),
            ("emergency modal", "CC.goP('home'); CC.trigger()"),
            ("booking week", "CC.bookModal('video')"),
            ("export modal", "CC.exportModal()"),
            ("shortcut sheet", "CC.keySheet()"),
        ]:
            await pg.evaluate(f"() => {{ {js}; }}")
            await pg.wait_for_timeout(1500)
            r = await pg.evaluate("""() => ({ doc: document.documentElement.scrollWidth, win: window.innerWidth,
                x: window.scrollX, modal: (() => { const m=document.querySelector('#modal'); if(!m||!m.offsetWidth) return 'none';
                  return m.scrollWidth > m.clientWidth + 1 ? m.scrollWidth + '>' + m.clientWidth : 'fits'; })(),
                panel: (() => { const p=document.querySelector('.unlock-panel'); if(!p) return 'n/a';
                  return Math.round(p.getBoundingClientRect().width) + 'px wide'; })() })""")
            ok = r["doc"] <= r["win"] + 1 and r["win"] == r["x"] + r["win"] and r["modal"] in ("none", "fits")
            print(f"  {'✓' if ok else '✗'} {label}: doc {r['doc']} / win {r['win']} · modal {r['modal']} · panel {r['panel']}")
            await pg.evaluate("() => { CC.closeModal(); CC.hideUnlock('patient'); document.querySelectorAll('.unlock-host').forEach(h=>h.classList.add('hidden')); }")
            await pg.wait_for_timeout(300)
        await ctx.close()
        await b.close()
asyncio.run(main())
