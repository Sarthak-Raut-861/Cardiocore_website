import asyncio
from playwright.async_api import async_playwright
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        pg = await b.new_page(viewport={'width':1440,'height':960}, reduced_motion='reduce')
        errs=[]
        pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto('file:///home/user/cardiocore.html'); await pg.wait_for_timeout(900)
        await pg.evaluate("CC.goP('health'); CC.goP('appts')"); await pg.wait_for_timeout(400)
        for r in ['24H','30D','3M','1Y','7D']:
            await pg.evaluate(f"CC.setRange('{r}')"); await pg.wait_for_timeout(200)
            ok = await pg.evaluate("document.querySelector('#rangeTabs .tab.on').dataset.range")
            print('range', r, '->', ok)
        # modal cleanup check
        await pg.evaluate("CC.urgentModal()"); await pg.wait_for_timeout(400)
        await pg.evaluate("CC.closeModal()"); await pg.wait_for_timeout(600)
        inner = await pg.evaluate("document.getElementById('modal').innerHTML.length")
        print('modal content after close:', inner)
        # keyboard: escape closes
        await pg.evaluate("CC.bookModal()"); await pg.wait_for_timeout(300)
        await pg.keyboard.press('Escape'); await pg.wait_for_timeout(500)
        print('esc closes:', await pg.evaluate("!document.getElementById('scrim').classList.contains('on')"))
        # OTP flow
        await pg.evaluate("CC.go('login-patient')"); await pg.wait_for_timeout(400)
        await pg.evaluate("document.querySelector('#login-patient [data-mode=otp]').click()"); await pg.wait_for_timeout(200)
        await pg.evaluate("CC.sendOtp()"); await pg.wait_for_timeout(200)
        await pg.evaluate("document.querySelectorAll('#otpBlock .otp').forEach((i,ix)=>i.value='481200'[ix])")
        await pg.evaluate("document.getElementById('pFormOtp').querySelector('button[type=submit]').click()"); await pg.wait_for_timeout(1400)
        print('otp login screen:', await pg.evaluate("document.body.dataset.screen"))
        # copy / disclaimer audit
        txt = await pg.evaluate("document.body.innerText")
        for phrase in ['not a diagnostic device','does not diagnose','consent','Never change or stop a prescribed medication']:
            print(f"  copy '{phrase}':", phrase.lower() in txt.lower())
        print('errors:', errs)
        await b.close()
asyncio.run(main())
