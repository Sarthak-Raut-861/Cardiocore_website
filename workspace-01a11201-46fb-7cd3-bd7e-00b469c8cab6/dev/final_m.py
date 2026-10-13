import asyncio
from playwright.async_api import async_playwright
JOBS = [('10-mobile-app', "CC.goP('home')"), ('11-mobile-onb', "CC.go('onboard'); CC.onbShow(2)"),
        ('12-mobile-symptoms', "CC.goP('symptoms')"), ('13-mobile-dark', "CC.toggleTheme(); CC.goP('device')")]
async def main():
    async with async_playwright() as p:
        for label, js in JOBS:
            b = await p.chromium.launch()
            pg = await b.new_page(viewport={'width':390,'height':844}, device_scale_factor=1, reduced_motion='reduce')
            try:
                await pg.goto('file:///home/user/cardiocore.html'); await pg.wait_for_timeout(1000)
                await pg.evaluate("CC.patientLogin(new Event('submit'))"); await pg.wait_for_timeout(1000)
                await pg.evaluate("CC.skipOnboarding()"); await pg.wait_for_timeout(700)
                await pg.evaluate(js); await pg.wait_for_timeout(900)
                await pg.screenshot(path=f'dev/shots/{label}.png', timeout=15000)
                print('OK  ', label)
            except Exception as e:
                print('FAIL', label, str(e).split('\n')[0][:60])
            await b.close()
asyncio.run(main())
