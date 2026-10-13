import asyncio
from playwright.async_api import async_playwright

JOBS = [
  ('M1-mobile-hero',     390, 2, "1"),
  ('M2-mobile-app',      390, 2, "CC.patientLogin(new Event('submit'))"),
  ('M3-mobile-doctor',   390, 2, "CC.goD('roster')"),
  ('M4-mobile-twin',     390, 2, "CC.goP('twin')"),
  ('T1-tablet-hero',     820, 2, "1"),
  ('T2-tablet-app',      820, 2, "CC.patientLogin(new Event('submit'))"),
  ('D1-alerts',         1440, 1, "CC.goP('alerts')"),
  ('D2-twin-patient',   1440, 1, "CC.goP('twin')"),
  ('D3-profile',        1440, 1, "CC.goP('profile')"),
  ('D4-doc-schedule',   1440, 1, "CC.goD('schedule')"),
  ('D5-doc-messages',   1440, 1, "CC.goD('messages')"),
  ('D6-doc-appts',      1440, 1, "CC.goD('appts')"),
]
async def main():
    async with async_playwright() as p:
        for label, w, dsf, js in JOBS:
            b = await p.chromium.launch()
            pg = await b.new_page(viewport={'width':w,'height':900}, device_scale_factor=dsf, reduced_motion='reduce')
            try:
                await pg.goto('file:///home/user/cardiocore.html'); await pg.wait_for_timeout(1100)
                if js != '1':
                    await pg.evaluate(js); await pg.wait_for_timeout(1300)
                await pg.screenshot(path=f'shots/{label}.png', timeout=20000)
                print('OK  ', label)
            except Exception as e:
                print('FAIL', label, str(e).split('\n')[0][:70])
            await b.close()
        print('done')
asyncio.run(main())
