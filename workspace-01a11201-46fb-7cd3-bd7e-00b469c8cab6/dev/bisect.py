import asyncio
from playwright.async_api import async_playwright

VARIANTS = [
  ('full-app',     "1"),
  ('no-canvas',    "document.querySelectorAll('canvas').forEach(c=>c.style.display='none')"),
  ('no-scan',      "document.querySelectorAll('.scan').forEach(c=>c.classList.remove('scan'))"),
  ('anim-off',     "CC.setAnim(false)"),
  ('no-blob',      "document.querySelectorAll('.blob').forEach(c=>c.style.display='none')"),
  ('public-only',  "CC.go('site')"),
  ('roster',       "CC.goD('roster')"),
]
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        for label, js in VARIANTS:
            m = await b.new_page(viewport={'width':390,'height':844}, device_scale_factor=2, reduced_motion='reduce')
            try:
                await m.goto('file:///home/user/cardiocore.html'); await m.wait_for_timeout(1200)
                if label not in ('public-only',):
                    await m.evaluate("CC.patientLogin(new Event('submit'))"); await m.wait_for_timeout(1500)
                await m.evaluate(js); await m.wait_for_timeout(500)
                await m.screenshot(path=f'shots/b-{label}.png', timeout=15000)
                print('OK  ', label)
            except Exception as e:
                print('FAIL', label, str(e).split('\n')[0][:60])
            await m.close()
        await b.close()
asyncio.run(main())
