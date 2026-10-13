#!/usr/bin/env python3
"""Phase-4 screenshots: the About page (light + dark, three widths) and the new
messaging / units / downloads surfaces."""
import asyncio
from playwright.async_api import async_playwright

URL = "file:///home/user/cardiocore.html"
OUT = "/home/user/dev/shots"
VP = {"mobile": {"width": 390, "height": 844},
      "tablet": {"width": 768, "height": 1024},
      "desktop": {"width": 1440, "height": 950}}


async def shot(b, name, fn, vp="desktop", full=False, height=None):
    v = dict(VP[vp])
    if height:
        v["height"] = height
    ctx = await b.new_context(viewport=v)
    pg = await ctx.new_page()
    errs = []
    pg.on("pageerror", lambda e: errs.append(str(e)))
    await pg.goto(URL, wait_until="load")
    await pg.wait_for_timeout(700)
    await fn(pg)
    await pg.wait_for_timeout(600)
    await pg.screenshot(path=f"{OUT}/{name}.png", full_page=full)
    await ctx.close()
    print(("  ok  " if not errs else "  !   ") + name + ("" if not errs else "  " + str(errs[:1])))


async def about(pg):
    await pg.evaluate("() => CC.go('about')")
    await pg.wait_for_timeout(900)


async def about_dark(pg):
    await pg.evaluate("() => { CC.applyTheme('dark'); CC.go('about'); }")
    await pg.wait_for_timeout(900)
    await pg.evaluate("() => window.scrollTo(0, 1400)")
    await pg.wait_for_timeout(500)


async def messages(pg):
    await pg.evaluate("() => CC.goP('messages')")
    await pg.wait_for_timeout(1100)


async def messages_dark(pg):
    await pg.evaluate("() => { CC.applyTheme('dark'); CC.goP('messages'); }")
    await pg.wait_for_timeout(1100)


async def health_units(pg):
    await pg.evaluate("() => CC.goP('health')")
    await pg.wait_for_timeout(1100)
    await pg.evaluate("() => CC.setUnits('conv')")
    await pg.wait_for_timeout(700)


async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(args=["--no-sandbox"])
        print("phase 4 shots")
        await shot(b, "p4-about-desktop", about, "desktop")
        await shot(b, "p4-about-desktop-full", about, "desktop", full=True)
        await shot(b, "p4-about-tablet", about, "tablet", full=True)
        await shot(b, "p4-about-mobile", about, "mobile", full=True)
        await shot(b, "p4-about-dark", about_dark, "desktop")
        await shot(b, "p4-messages-desktop", messages, "desktop")
        await shot(b, "p4-messages-mobile", messages, "mobile", full=True)
        await shot(b, "p4-messages-dark", messages_dark, "desktop")
        await shot(b, "p4-health-conventional", health_units, "desktop")
        await b.close()

asyncio.run(main())
