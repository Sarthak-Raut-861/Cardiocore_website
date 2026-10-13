import asyncio
from playwright.async_api import async_playwright
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        pg = await b.new_page(viewport={'width':390,'height':844}, reduced_motion='reduce')
        await pg.goto('file:///home/user/cardiocore.html'); await pg.wait_for_timeout(900)
        r = await pg.evaluate("""() => {
          CC.goP('home');
          const out=[];
          document.querySelectorAll('#app-patient *').forEach(e=>{
            if(e.offsetParent===null) return;
            const rc=e.getBoundingClientRect();
            if(rc.right > 380 && rc.width>4 && rc.height>4){
              const cs=getComputedStyle(e);
              out.push({cls:(e.className||'').toString().slice(0,42), w:Math.round(rc.width), right:Math.round(rc.right),
                        disp:cs.display, minw:cs.minWidth, ws:cs.flexWrap, inline:(e.getAttribute('style')||'').slice(0,54)});
            }
          });
          return out.slice(0,14);
        }""")
        for x in r: print(x)
        await b.close()
asyncio.run(main())
