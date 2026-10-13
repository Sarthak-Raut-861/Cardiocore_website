import asyncio
from playwright.async_api import async_playwright
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        pg = await b.new_page(viewport={'width':1440,'height':960}, reduced_motion='reduce')
        errs=[]
        pg.on('pageerror', lambda e: errs.append('PAGEERROR: '+str(e)))
        pg.on('console', lambda m: errs.append('CONSOLE '+m.type+': '+m.text) if m.type=='error' else None)
        await pg.goto('file:///home/user/cardiocore.html'); await pg.wait_for_timeout(1000)
        steps = [
          ("public: sign in buttons", "document.querySelector('[data-go=login-patient]').click()"),
          ("patient login", "document.getElementById('pFormPass').querySelector('button[type=submit]').click()"),
          ("patient nav: health", "document.querySelector('.nav-item[data-pview=health]').click()"),
          ("range tab 30D", "document.querySelector('#rangeTabs .tab[data-range=30D]').click()"),
          ("record ecg", "CC.startEcg()"),
          ("stop ecg", "CC.stopEcg(false)"),
          ("alerts view", "document.querySelector('.nav-item[data-pview=alerts]').click()"),
          ("open urgent assessment", "CC.urgentModal()"),
          ("close modal", "CC.closeModal()"),
          ("book appointment", "CC.bookModal()"),
          ("confirm booking", "CC.confirmBooking()"),
          ("close modal", "CC.closeModal()"),
          ("share modal", "CC.shareModal()"),
          ("close", "CC.closeModal()"),
          ("video", "CC.joinVideo()"),
          ("close", "CC.closeModal()"),
          ("records view", "document.querySelector('.nav-item[data-pview=records]').click()"),
          ("sign out", "document.querySelector('.side-foot [data-go=home]').click()"),
          ("doctor sign in", "CC.go('login-doctor'); document.querySelector('#login-doctor form button[type=submit]').click()"),
          ("doctor nav: patients", "document.querySelector('.nav-item[data-dview=patients]').click()"),
          ("open patient", "CC.openPatient('rohit')"),
          ("close", "CC.closeModal()"),
          ("message modal", "CC.messageModal('meera')"),
          ("close", "CC.closeModal()"),
          ("ecg review view", "document.querySelector('.nav-item[data-dview=review]').click()"),
          ("analytics", "document.querySelector('.nav-item[data-dview=analytics]').click()"),
          ("schedule", "document.querySelector('.nav-item[data-dview=schedule]').click()"),
          ("messages", "document.querySelector('.nav-item[data-dview=messages]').click()"),
          ("send message", "document.querySelector('.view[data-view=messages] input.input').dispatchEvent(new KeyboardEvent('keydown',{key:'Enter'}))"),
          ("back to site", "CC.go('home')"),
          ("scroll to faq", "document.querySelector('[data-scroll=faq]').click()"),
        ]
        for label, js in steps:
            try:
                await pg.evaluate(js); await pg.wait_for_timeout(650)
                state = await pg.evaluate("document.body.dataset.screen + ' | ' + (document.querySelector('.modal-h h3')?.textContent.trim() || '')")
                print(f"  ✓ {label:26s} → {state}")
            except Exception as e:
                print(f"  ✗ {label:26s} {str(e).splitlines()[0][:90]}")
        print('errors:', len(errs))
        for e in errs[:8]: print('   ', e[:200])
        await b.close()
asyncio.run(main())
