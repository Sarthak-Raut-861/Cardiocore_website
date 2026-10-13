import asyncio
from playwright.async_api import async_playwright
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        pg = await b.new_page(viewport={'width':1440,'height':960})
        await pg.goto('file:///home/user/cardiocore.html'); await pg.wait_for_timeout(2000)
        await pg.evaluate("CC.goP('ecg')"); await pg.wait_for_timeout(800)
        r = await pg.evaluate("""() => {
          const v = document.querySelector('.view[data-view=ecg]');
          const btns = [...v.querySelectorAll('button')].map(b=>({t:b.textContent.trim().slice(0,24), y:Math.round(b.getBoundingClientRect().top)}));
          const card = v.querySelector('.card.pad-lg');
          return {count:v.querySelectorAll('.btn').length, btns, cardH: Math.round(card.getBoundingClientRect().height), cardText: card.innerText.slice(0,600)};
        }""")
        print(r['count'], r['cardH'])
        for x in r['btns'][:14]: print(x)
        print('---- text ----'); print(r['cardText'][:400])
        await b.close()
asyncio.run(main())
