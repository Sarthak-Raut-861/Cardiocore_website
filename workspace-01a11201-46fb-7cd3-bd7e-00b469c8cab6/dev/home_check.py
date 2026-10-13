import asyncio
from playwright.async_api import async_playwright
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        pg = await b.new_page(viewport={'width':390,'height':844}, reduced_motion='reduce')
        await pg.goto('file:///home/user/cardiocore.html'); await pg.wait_for_timeout(1200)
        await pg.evaluate("CC.patientLogin(new Event('submit'))"); await pg.wait_for_timeout(2200)
        r = await pg.evaluate("() => ({sw:document.documentElement.scrollWidth, cw:document.documentElement.clientWidth})")
        print('patient home mobile:', r)
        await pg.screenshot(path='shots/M2-app-final.png', timeout=20000)
        print('shot ok')
        await b.close()
asyncio.run(main())
