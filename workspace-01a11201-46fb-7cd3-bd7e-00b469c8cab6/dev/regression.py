import asyncio
from playwright.async_api import async_playwright
STEPS = [
  ("public nav → platform", "document.querySelector('[data-scroll=platform]').click()"),
  ("patient sign in", "document.querySelector('[data-go=login-patient]').click(); document.getElementById('pFormPass').querySelector('button[type=submit]').click()"),
  ("wizard forward", "CC.onbStep(1); CC.onbStep(1)"),
  ("wizard skip", "CC.skipOnboarding()"),
  ("open palette", "CC.palette('')"),
  ("palette → twin", "CC.closePalette(); CC.goP('twin')"),
  ("range 3M", "CC.setRange('3M')"),
  ("record ECG", "CC.startEcg()"),
  ("stop ECG", "CC.stopEcg(false)"),
  ("theme dark", "CC.toggleTheme()"),
  ("theme light", "CC.toggleTheme()"),
  ("notifications + filter", "CC.goP('notifications'); document.querySelector('[data-nfilter=health]').click()"),
  ("mark all read", "CC.markAllRead()"),
  ("lipid tabs", "CC.goP('lipids'); document.querySelector('[data-lipid=trigs]').click()"),
  ("add lab", "CC.addLabModal(); CC.saveLab()"),
  ("log symptom", "CC.symptomModal(); CC.saveSymptom()"),
  ("share symptom", "CC.shareSymptom(1)"),
  ("close modal", "CC.closeModal()"),
  ("device → sync", "CC.goP('device'); CC.syncNow()"),
  ("go offline", "CC.toggleOnline()"),
  ("back online", "CC.toggleOnline()"),
  ("book appointment", "CC.goP('appts'); CC.bookModal()"),
  ("confirm booking", "CC.confirmBooking()"),
  ("close", "CC.closeModal()"),
  ("share data", "CC.shareModal(); CC.closeModal()"),
  ("urgent sheet", "CC.urgentModal(); CC.closeModal()"),
  ("marker detail", "CC.goP('marker')"),
  ("doctor sign in", "CC.go('login-doctor'); document.querySelector('#login-doctor form button[type=submit]').click()"),
  ("cohort high risk", "CC.goD('patients'); document.querySelector('[data-cohort=highrisk]').click()"),
  ("open patient", "CC.openPatient('meera')"),
  ("close", "CC.closeModal()"),
  ("handover aarav", "CC.goD('handover')"),
  ("handover rohit", "document.getElementById('handoverPatient').value='rohit'; CC.handover()"),
  ("analytics", "CC.goD('analytics')"),
  ("messages", "CC.goD('messages')"),
  ("print record", "window.print=()=>{}; CC.printReport('record')"),
  ("print lipids", "CC.printReport('lipids')"),
  ("print handover", "CC.printReport('handover')"),
  ("sign out", "CC.go('home')"),
]
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        pg = await b.new_page(viewport={'width':1440,'height':960}, reduced_motion='reduce')
        errs=[]
        pg.on('pageerror', lambda e: errs.append('JS: '+str(e)))
        pg.on('console', lambda m: errs.append('CONSOLE: '+m.text) if m.type=='error' else None)
        await pg.goto('file:///home/user/cardiocore.html'); await pg.wait_for_timeout(1300)
        bad=0
        for label, js in STEPS:
            try:
                await pg.evaluate(js); await pg.wait_for_timeout(520)
            except Exception as e:
                bad+=1; print(f"  ✗ {label}: {str(e).splitlines()[0][:80]}")
        print(f"steps run: {len(STEPS)} · failures: {bad} · js errors: {len(errs)}")
        for e in errs[:5]: print('   ', e[:180])
        await b.close()
asyncio.run(main())
