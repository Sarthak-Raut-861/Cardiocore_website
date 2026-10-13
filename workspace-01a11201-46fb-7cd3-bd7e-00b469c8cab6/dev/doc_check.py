import asyncio
from playwright.async_api import async_playwright
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        pg = await b.new_page(viewport={'width':390,'height':844}, reduced_motion='reduce')
        await pg.goto('file:///home/user/cardiocore.html'); await pg.wait_for_timeout(1200)
        await pg.evaluate("CC.goD('roster')"); await pg.wait_for_timeout(900)
        r = await pg.evaluate("""() => { const d=document.documentElement;
          const list=[...document.querySelectorAll('#app-doctor *')].filter(e=>{const rc=e.getBoundingClientRect();
            return e.offsetParent!==null && rc.width>6 && rc.right > d.clientWidth+2;})
            .map(e=>({c:((e.className||'')+'').slice(0,40), w:Math.round(e.getBoundingClientRect().width), x:Math.round(e.getBoundingClientRect().left),
                      par:((e.parentElement.className||'')+'').slice(0,26)}));
          return {sw:d.scrollWidth, cw:d.clientWidth, list:list.slice(0,10)}; }""")
        print('doc roster mobile:', r['sw'], r['cw'])
        for x in r['list']: print('  ', x)
        await b.close()
asyncio.run(main())
