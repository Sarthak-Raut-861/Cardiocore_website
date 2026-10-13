import asyncio
from playwright.async_api import async_playwright
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        for dsf in (1,2):
            for anim in ('allow','disabled'):
                m = await b.new_page(viewport={'width':390,'height':844}, device_scale_factor=dsf)
                await m.goto('file:///home/user/cardiocore.html'); await m.wait_for_timeout(1500)
                try:
                    await m.screenshot(path=f'shots/m-{dsf}-{anim}.png', animations=anim, timeout=12000)
                    print('OK', dsf, anim)
                except Exception as e:
                    print('FAIL', dsf, anim, str(e)[:80])
                await m.close()
        await b.close()
asyncio.run(main())
