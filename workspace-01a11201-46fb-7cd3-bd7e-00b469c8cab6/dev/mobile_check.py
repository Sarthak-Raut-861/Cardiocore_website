import asyncio
from playwright.async_api import async_playwright
JOBS=[('M1-hero',"1"),('M2-app',"CC.patientLogin(new Event('submit'))"),('M2b-health',"CC.goP('health')"),
      ('M2c-ecg',"CC.goP('ecg')"),('M2d-twin',"CC.goP('twin')"),('M2e-records',"CC.goP('records')"),
      ('M3-doctor',"CC.goD('roster')"),('M4-doc-review',"CC.goD('review')")]
async def main():
    async with async_playwright() as p:
        for label, js in JOBS:
            b = await p.chromium.launch()
            pg = await b.new_page(viewport={'width':390,'height':844}, device_scale_factor=2, reduced_motion='reduce')
            await pg.goto('file:///home/user/cardiocore.html'); await pg.wait_for_timeout(1000)
            if js!='1':
                await pg.evaluate(js); await pg.wait_for_timeout(1200)
            over = await pg.evaluate("""() => { const d=document.documentElement;
               const wide=[...document.querySelectorAll('body *')].filter(e=>e.getBoundingClientRect().right > d.clientWidth+2 && e.offsetParent!==null)
                 .slice(0,6).map(e=>e.className?.toString?.().slice(0,40)||e.tagName);
               return {scrollW:d.scrollWidth, clientW:d.clientWidth, wide}; }""")
            print(label, 'scrollW', over['scrollW'], 'client', over['clientW'], 'overflowing:', over['wide'][:4])
            await pg.screenshot(path=f'shots/{label}.png', timeout=20000)
            await b.close()
asyncio.run(main())
