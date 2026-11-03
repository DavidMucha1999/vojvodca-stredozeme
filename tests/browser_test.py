# Test v skutočnom prehliadači (Chromium cez Playwright).
# Spustenie: pip install playwright && playwright install chromium && python tests/browser_test.py
import sys
from playwright.sync_api import sync_playwright
URL=sys.argv[1] if len(sys.argv)>1 else 'file://' + __import__('os').path.abspath(__import__('os').path.join(__import__('os').path.dirname(__file__), '..', 'Vojvodca Stredozeme.html'))
with sync_playwright() as p:
    b=p.chromium.launch(args=['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']);pg=b.new_page(viewport={'width':960,'height':640}); pg.set_default_timeout(180000)
    errs=[];pg.on('pageerror',lambda e:errs.append(str(e)))
    pg.goto(URL)
    pg.wait_for_function("typeof game !== 'undefined' && game.scene.getScenes(true).some(s => s.scene.key === 'Intro')")
    E=pg.evaluate
    clk=lambda t:E("t => { const b = [...document.querySelectorAll('#ov button, #bt button')].find(b => b.textContent.trim().startsWith(t)); if (!b) return false; b.click(); return true; }", t)
    pg.click('text=Nová hra');pg.wait_for_timeout(300);pg.click('text=Vyraziť do boja');pg.wait_for_timeout(600);clk('Rozumiem');pg.wait_for_timeout(200);clk('Na cestu');pg.wait_for_timeout(1500)
    print(E("""(()=>{try{G.camp=1;G.gold=9999;for(let i=0;i<30000;i++){if(mode==='map')updMap(1);else if(mode==='battle'){for(const u of U)if(u.t)u.hp=0;updBattle(1)}else{const b=[...document.querySelectorAll('#bt button')].find(b=>!b.disabled);if(b&&Math.random()<.5)b.click();else{ov.classList.add('hide');mode='map'}}}return 'sim day '+G.day+' st '+JSON.stringify(G.st)+' log '+LOG.length}catch(e){return 'ERR '+e.stack}})()"""))
    print(E("""(()=>{try{ov.classList.add('hide');mode='map';G.camp=0;const i=TW.findIndex(t=>hos(t.f,G.fac)&&t.f!==9);G.inf=40;siege(i);TW[i].sg.lad=1;siegeMenu(i);[...document.querySelectorAll('#bt button')].find(b=>/Zaútočiť/.test(b.textContent)).click();let k=0;while(mode==='battle'&&k<12000){U[0].hp=999;updBattle(1);k++}return 'siege '+k+' '+document.querySelector('#ov h1').textContent}catch(e){return 'ERR '+e.stack}})()"""))
    for t in ['f','l','u','h','r']: E(f"ov.classList.add('hide');mode='map';ency('{t}')")
    print(E("""(()=>{try{ov.classList.add('hide');mode='map';town(0);for(const c of 'revhd')tsub(0,c);ovw();ov.classList.add('hide');mode='map';sts();ov.classList.add('hide');mode='map';tro();ov.classList.add('hide');mode='map';achs();ov.classList.add('hide');mode='map';dnk();ov.classList.add('hide');mode='map';G.king=1;KD=0;upd();return 'menus ok'}catch(e){return 'ERR '+e.stack}})()"""))
    pg.wait_for_timeout(300)
    # mapa po bitke (scéna sa spustí znova) s obliehaním a zrazom vojska na obrazovke – predtým tu mapa zamrzla
    n0 = len(errs)
    E("(() => { ov.classList.add('hide'); if (ROOM) leaveRoom(); mode = 'map'; const i = TW.findIndex(t => hos(t.f, G.fac) && t.f !== 9 && !t.sg); startSiege(i, G.fac === 6 ? 6 : G.fac, 'G'); G.x = G.tx = TW[i].x - 80; G.y = G.ty = TW[i].y + 60; })()")
    pg.wait_for_function("f => game.loop.frame > f + 6", arg=E("game.loop.frame"), timeout=120000)   # popis obliehania sa vytvorí pred bitkou
    E("startBattle({ n: 3, f: 9, nm: 'Test' })")
    pg.wait_for_function("game.scene.isActive('Battle') && game.scene.getScene('Battle').ready", timeout=120000)
    E("for (const u of U) if (u.t) u.hp = 0"); pg.wait_for_function("mode === 'over'", timeout=120000)
    E("(() => { ov.classList.add('hide'); mode = 'map'; const i = TW.findIndex(t => hos(t.f, G.fac) && t.f !== 9 && !t.sg); startSiege(i, G.fac === 6 ? 6 : G.fac, 'G'); G.x = G.tx = TW[i].x - 80; G.y = G.ty = TW[i].y + 60; const m = marshal(0); if (m) { m.mu = { t: i, day: G.day }; G.fac = 0; } })()")
    pg.wait_for_function("game.scene.isActive('Map')", timeout=120000)
    pg.wait_for_function("f => game.loop.frame > f + 10", arg=E("game.loop.frame"), timeout=120000)
    print('map after battle', 'ok' if len(errs) == n0 else 'ERR ' + str(errs[n0:n0 + 2]))
    E("TW.forEach(t => t.sg = null); G.fac = 6; ov.classList.add('hide'); mode = 'map'")
    # všetky izometrické miestnosti, každá dvakrát (scéna sa znova používa) a počkať na niekoľko snímok – chyba v update() by tu vyskočila
    rooms = ["enterCastle(%d,'yard')", "enterCastle(%d,'hall')", "enterTavern(%d)"]
    n_err = len(errs)
    frames = lambda: pg.wait_for_function("f => game.loop.frame > f + 4", arg=E("game.loop.frame"))
    for rep in range(2):
        for i in [0, E("TW.findIndex(t => t.n === 'Dale')"), E("TW.findIndex(t => t.n === 'Barad-dûr')")]:
            for r in rooms:
                E("ov.classList.add('hide'); if (ROOM) leaveRoom(); mode = 'map'; " + (r % i)); frames()
        for v in [0, E("VL.findIndex(v => regionAt(v.x, v.y) === 'a')")]:
            E(f"ov.classList.add('hide'); if (ROOM) leaveRoom(); mode = 'map'; enterVillage({v})"); frames()
        for pl in range(E("PLACES.length")):
            E(f"ov.classList.add('hide'); if (ROOM) leaveRoom(); mode = 'map'; enterPlace({pl})"); frames()
    E("ov.classList.add('hide'); if (ROOM) leaveRoom(); mode = 'map'")
    print('rooms', 'ok' if len(errs) == n_err else 'ERR ' + str(errs[n_err:n_err + 2]))
    print(E("""(()=>{try{ov.classList.add('hide');mode='map';save();G=null;load();return 'load '+(G&&G.day)}catch(e){return 'ERR '+e.stack}})()"""))
    pg.wait_for_timeout(500);
    print('errors',errs[:5]);b.close()
    if errs: sys.exit(1)
