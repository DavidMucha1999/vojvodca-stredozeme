# Test Phaser verzie bez internetu: namiesto Phaseru z CDN sa podstrčí tests/phaser-stub.js.
# Overuje scény a prechody Úvod → Mapa → Bitka → Mapa a obliehanie.
# Spustenie: python tests/phaser_test.py
import os
from playwright.sync_api import sync_playwright
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
STUB = open(os.path.join(ROOT, 'tests', 'phaser-stub.js'), encoding='utf-8').read()
with sync_playwright() as p:
    b = p.chromium.launch(); pg = b.new_page(viewport={'width': 960, 'height': 640})
    errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.route('**/phaser.min.js', lambda r: r.fulfill(status=200, content_type='application/javascript', body=STUB))
    pg.route('**/fonts.googleapis.com/**', lambda r: r.abort())
    pg.goto('file://' + os.path.join(ROOT, 'phaser.html')); pg.wait_for_timeout(800)
    E = pg.evaluate
    print('scény po štarte:', E("[...__game.active.keys()].join(',')"))
    pg.click('text=Vyraziť do boja'); pg.wait_for_timeout(300); pg.click('text=Rozumiem'); pg.wait_for_timeout(200); pg.click('text=Na cestu'); pg.wait_for_timeout(500)
    print('po novej hre:', E("[...__game.active.keys()].join(',')"), 'textúr', E("__STUB.tex.size"))
    E("G.camp=1"); pg.wait_for_timeout(3000)
    print('mapa beží, deň', E("G.day"), 'armád v scéne', E("__game.active.get('Map').armies.size"), 'E', E("E.length"))
    E("startBattle(E.find(e=>hos(e.f,G.fac)&&!e.nz))"); pg.wait_for_timeout(600)
    print('bitka:', E("[...__game.active.keys()].join(',')"), 'spritov', E("__game.active.get('Battle') ? __game.active.get('Battle').units.size : -1"))
    E("for(const u of U) if(u.t) u.hp=0"); pg.wait_for_timeout(600)
    print('po bitke:', E("mode"), E("[...__game.active.keys()].join(',')"))
    E("ov.classList.add('hide'); mode='map'; G.eq.w = SH[0].it.length-2; G.inf=30; const i=TW.findIndex(t=>hos(t.f,G.fac)&&t.f!==9); siege(i); [...document.querySelectorAll('#bt button')].find(b=>/rebríky/.test(b.textContent)).click(); [...document.querySelectorAll('#bt button')].find(b=>/Zaútočiť/.test(b.textContent)).click()")
    pg.wait_for_timeout(600)
    print('obliehanie:', E("[...__game.active.keys()].join(',')"), 'SGB', E("JSON.stringify(SGB)"))
    E("U[0].hp=1e9; for(const u of U) u.t && (u.hp = Math.min(u.hp, 1))"); pg.wait_for_timeout(4000)
    print('koniec obliehania:', E("mode"), E("[...__game.active.keys()].join(',')"))
    print('chyby:', errs[:5], E("__STUB.log.slice(0,3)"))
    b.close()
