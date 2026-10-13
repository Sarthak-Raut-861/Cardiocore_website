import asyncio
from playwright.async_api import async_playwright
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        pg = await b.new_page(viewport={'width':1440,'height':960}, reduced_motion='reduce')
        errs=[]
        pg.on('pageerror', lambda e: errs.append(str(e)))
        pg.on('console', lambda m: errs.append(m.text) if m.type=='error' else None)
        await pg.goto('file:///home/user/cardiocore.html'); await pg.wait_for_timeout(1500)
        await pg.screenshot(path='dev/shots/FINAL-hero.png')
        await pg.evaluate("CC.goP('home')"); await pg.wait_for_timeout(1200)
        await pg.screenshot(path='dev/shots/FINAL-patient.png')
        await pg.evaluate("CC.goD('roster')"); await pg.wait_for_timeout(1200)
        await pg.screenshot(path='dev/shots/FINAL-doctor.png')
        print('errors:', errs)
        await b.close()
asyncio.run(main())
