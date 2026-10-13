import asyncio, sys
from playwright.async_api import async_playwright
CASES=[('home-app',"CC.patientLogin(new Event('submit'))"),('health',"CC.goP('health')"),('ecg',"CC.goP('ecg')"),
       ('twin',"CC.goP('twin')"),('alerts',"CC.goP('alerts')"),('appts',"CC.goP('appts')"),('meds',"CC.goP('meds')"),
       ('records',"CC.goP('records')"),('profile',"CC.goP('profile')"),('doc-roster',"CC.goD('roster')"),
       ('doc-appts',"CC.goD('appts')"),('doc-patients',"CC.goD('patients')"),('doc-review',"CC.goD('review')"),
       ('doc-msgs',"CC.goD('messages')"),('doc-analytics',"CC.goD('analytics')"),('doc-sched',"CC.goD('schedule')")]
async def main():
    w = int(sys.argv[1]); h_ = int(sys.argv[2]); tag = sys.argv[3]
    async with async_playwright() as p:
        b = await p.chromium.launch()
        pg = await b.new_page(viewport={'width':w,'height':h_}, device_scale_factor=1, reduced_motion='reduce')
        await pg.goto('file:///home/user/cardiocore.html'); await pg.wait_for_timeout(800)
        bad=0
        for label, js in CASES:
            await pg.evaluate(js); await pg.wait_for_timeout(450)
            r = await pg.evaluate("""() => { const d=document.documentElement;
              const over=[...document.querySelectorAll('body *')].filter(e=>{const rc=e.getBoundingClientRect();
                 return e.offsetParent!==null && rc.width>6 && rc.right > d.clientWidth+2;}).slice(0,4)
                 .map(e=>((e.className||'')+'').slice(0,34));
              return {sw:d.scrollWidth, cw:d.clientWidth, over}; }""")
            flag = 'OK ' if r['sw'] <= r['cw']+2 else 'OVER'
            if flag=='OVER': bad+=1
            print(f"{flag} {tag} {label:14s} scrollW={r['sw']} client={r['cw']} {r['over'][:3]}")
        print(f"--- {tag}: {bad} overflowing views ---")
        await b.close()
asyncio.run(main())
