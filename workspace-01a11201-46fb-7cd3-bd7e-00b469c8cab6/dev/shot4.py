import asyncio
from playwright.async_api import async_playwright
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        for label, js in [('blobs-off', "document.querySelectorAll('.blob').forEach(b=>b.style.display='none')"),
                          ('heart-off', "document.querySelectorAll('img').forEach(b=>b.style.display='none')"),
                          ('canvas-off', "document.querySelectorAll('canvas').forEach(b=>b.style.display='none')"),
                          ('none', "1")]:
            m = await b.new_page(viewport={'width':390,'height':844}, device_scale_factor=2)
            await m.goto('file:///home/user/cardiocore.html'); await m.wait_for_timeout(1400)
            await m.evaluate(js)
            await m.wait_for_timeout(400)
            try:
                await m.screenshot(path=f'shots/x-{label}.png', timeout=15000); print('OK  ', label)
            except Exception as e: print('FAIL', label, str(e)[:60])
            await m.close()
        await b.close()
asyncio.run(main())
