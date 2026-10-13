import asyncio
from playwright.async_api import async_playwright
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        pg = await b.new_page(viewport={'width':1440,'height':960}, reduced_motion='reduce')
        errs=[]
        pg.on('pageerror', lambda e: errs.append('PAGEERROR '+str(e)))
        pg.on('console', lambda m: errs.append('CONSOLE '+m.text) if m.type=='error' else None)
        await pg.goto('file:///home/user/cardiocore.html'); await pg.wait_for_timeout(1400)
        print('screen:', await pg.evaluate("document.body.dataset.screen"))
        # theme toggle
        await pg.evaluate("CC.toggleTheme()"); await pg.wait_for_timeout(600)
        print('theme:', await pg.evaluate("document.documentElement.dataset.theme"))
        await pg.screenshot(path='dev/shots/dark-site.png')
        await pg.evaluate("CC.toggleTheme()"); await pg.wait_for_timeout(500)
        # onboarding
        await pg.evaluate("CC.go('login-patient'); document.getElementById('pFormPass').querySelector('button[type=submit]').click()")
        await pg.wait_for_timeout(1600)
        print('after login:', await pg.evaluate("document.body.dataset.screen"))
        await pg.screenshot(path='dev/shots/onb-1.png')
        for i in range(4):
            await pg.evaluate("CC.onbStep(1)"); await pg.wait_for_timeout(350)
        await pg.screenshot(path='dev/shots/onb-5.png')
        print('step:', await pg.evaluate('X.store.step'), '| bmi:', await pg.evaluate('X.bmi()'))
        await pg.evaluate("CC.onbStep(1); CC.onbStep(1); CC.onbStep(1)")
        await pg.wait_for_timeout(400)
        await pg.screenshot(path='dev/shots/onb-8.png')
        await pg.evaluate("CC.onbStep(1)"); await pg.wait_for_timeout(1200)
        print('after finish:', await pg.evaluate("document.body.dataset.screen"), await pg.evaluate('X.onboarded()'))
        await pg.screenshot(path='dev/shots/after-onb-home.png')
        # palette
        await pg.evaluate("CC.palette('ldl')"); await pg.wait_for_timeout(500)
        await pg.screenshot(path='dev/shots/palette.png')
        print('palette items:', await pg.evaluate("document.querySelectorAll('#paletteList .pitem').length"))
        await pg.evaluate("CC.closePalette()")
        # new views
        for v in ['notifications','marker','lipids','symptoms','device']:
            await pg.evaluate(f"CC.goP('{v}')"); await pg.wait_for_timeout(700)
            await pg.screenshot(path=f'dev/shots/view-{v}.png')
        await pg.evaluate("X.addLabModal()"); await pg.wait_for_timeout(500)
        await pg.evaluate("X.saveLab()"); await pg.wait_for_timeout(700)
        print('labs:', await pg.evaluate("X.store.labs.length"))
        await pg.evaluate("X.symptomModal()"); await pg.wait_for_timeout(400)
        await pg.evaluate("X.saveSymptom()"); await pg.wait_for_timeout(700)
        print('symptoms:', await pg.evaluate("X.store.symptoms.length"))
        # offline
        await pg.evaluate("CC.toggleOnline()"); await pg.wait_for_timeout(700)
        await pg.screenshot(path='dev/shots/view-offline.png')
        await pg.evaluate("CC.toggleOnline()"); await pg.wait_for_timeout(500)
        # doctor handover + cohorts
        await pg.evaluate("CC.goD('handover')"); await pg.wait_for_timeout(800)
        await pg.screenshot(path='dev/shots/view-handover.png')
        await pg.evaluate("CC.goD('patients')"); await pg.wait_for_timeout(500)
        await pg.evaluate("document.querySelector('[data-cohort=highrisk]').click()"); await pg.wait_for_timeout(400)
        print('cohort count:', await pg.evaluate("document.getElementById('cohortCount').textContent"))
        # print report
        await pg.evaluate("X.printReport('record')"); await pg.wait_for_timeout(400)
        print('print len:', await pg.evaluate("document.getElementById('printReport').innerHTML.length"))
        print('ERRORS:', errs[:8])
        await b.close()
asyncio.run(main())
