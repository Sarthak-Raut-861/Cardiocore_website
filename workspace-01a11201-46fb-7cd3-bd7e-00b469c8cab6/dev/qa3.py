import asyncio, sys
from playwright.async_api import async_playwright
VIEWS = ['home','health','ecg','twin','alerts','notifications','appts','meds','records','lipids','marker','symptoms','device','profile']
DVIEWS = ['roster','appts','patients','review','messages','analytics','schedule','handover','dprofile']
async def main():
    w = int(sys.argv[1]); tag = sys.argv[2]
    async with async_playwright() as p:
        b = await p.chromium.launch()
        pg = await b.new_page(viewport={'width':w,'height':900}, reduced_motion='reduce')
        errs=[]
        pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto('file:///home/user/cardiocore.html'); await pg.wait_for_timeout(1200)
        bad=[]
        for v in VIEWS:
            await pg.evaluate(f"CC.goP('{v}')"); await pg.wait_for_timeout(400)
            r = await pg.evaluate("({sw:document.documentElement.scrollWidth, cw:document.documentElement.clientWidth})")
            if r['sw'] > r['cw']+2: bad.append((v, r))
        for v in DVIEWS:
            await pg.evaluate(f"CC.goD('{v}')"); await pg.wait_for_timeout(400)
            r = await pg.evaluate("({sw:document.documentElement.scrollWidth, cw:document.documentElement.clientWidth})")
            if r['sw'] > r['cw']+2: bad.append((v, r))
        # onboarding + palette overflow
        await pg.evaluate("CC.go('onboard'); CC.onbShow(3)"); await pg.wait_for_timeout(400)
        r = await pg.evaluate("({sw:document.documentElement.scrollWidth, cw:document.documentElement.clientWidth})")
        if r['sw'] > r['cw']+2: bad.append(('onboard', r))
        await pg.evaluate("CC.palette('ecg')"); await pg.wait_for_timeout(400)
        r = await pg.evaluate("({sw:document.documentElement.scrollWidth, cw:document.documentElement.clientWidth})")
        if r['sw'] > r['cw']+2: bad.append(('palette', r))
        print(f"{tag}: {'ALL CLEAR' if not bad else 'OVERFLOW ' + str(bad)} | js errors: {errs[:3]}")
        await b.close()
asyncio.run(main())
