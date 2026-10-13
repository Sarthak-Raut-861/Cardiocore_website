import asyncio
from playwright.async_api import async_playwright
JOBS = [
  ('01-hero-light', 1440, 1, "1"),
  ('02-onboarding', 1440, 1, "CC.go('onboard'); CC.onbShow(3)"),
  ('03-palette',    1440, 1, "CC.palette('aarav')"),
  ('04-patient-dark',1440,1, "CC.toggleTheme(); CC.goP('health')"),
  ('05-lipids',     1440, 1, "CC.goP('lipids')"),
  ('06-symptoms',   1440, 1, "CC.goP('symptoms')"),
  ('07-notifs',     1440, 1, "CC.goP('notifications')"),
  ('08-doc-roster-dark',1440,1,"CC.goD('roster'); CC.toggleTheme()"),
  ('09-handover',   1440, 1, "CC.goD('handover')"),
  ('10-mobile-app',  390, 2, "CC.goP('home')"),
  ('11-mobile-onb',  390, 2, "CC.go('onboard'); CC.onbShow(2)"),
]
async def main():
    async with async_playwright() as p:
        for label, w, dsf, js in JOBS:
            b = await p.chromium.launch()
            pg = await b.new_page(viewport={'width':w,'height':900}, device_scale_factor=dsf, reduced_motion='reduce')
            try:
                await pg.goto('file:///home/user/cardiocore.html'); await pg.wait_for_timeout(1100)
                await pg.evaluate("CC.patientLogin(new Event('submit'))"); await pg.wait_for_timeout(1200)
                await pg.evaluate("CC.skipOnboarding()"); await pg.wait_for_timeout(800)
                if js != '1': await pg.evaluate(js); await pg.wait_for_timeout(1200)
                await pg.screenshot(path=f'dev/shots/{label}.png', timeout=20000)
                print('OK  ', label)
            except Exception as e:
                print('FAIL', label, str(e).split('\n')[0][:60])
            await b.close()
asyncio.run(main())
