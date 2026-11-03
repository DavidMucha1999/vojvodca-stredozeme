# Test so skutočným Phaserom (vendor/phaser.min.js) v prehliadači Chromium.
# Prejde úvod, mapu, menu hradu, bitku a obliehanie, uloží snímky obrazovky do tests/screens/.
# Spustenie: python tests/real_phaser_test.py
import os, sys
from playwright.sync_api import sync_playwright
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
SHOTS = os.path.join(ROOT, 'tests', 'screens'); os.makedirs(SHOTS, exist_ok=True)
fails = []
def check(name, ok, info=''):
    print(('OK   ' if ok else 'CHYBA') + ' ' + name + (' – ' + str(info) if info != '' else ''))
    if not ok: fails.append(name)

with sync_playwright() as p:
    b = p.chromium.launch(args=['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'])
    pg = b.new_page(viewport={'width': 1200, 'height': 800})
    pg.set_default_timeout(180000)   # softvérové vykresľovanie: nahrávanie textúr na pozadí môže snímky spomaliť
    errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.on('console', lambda m: m.type == 'error' and 'fonts.googleapis' not in m.text and 'ERR_' not in m.text and errs.append('console: ' + m.text))
    pg.route('**/fonts.googleapis.com/**', lambda r: r.abort())
    shot = lambda n: pg.screenshot(path=os.path.join(SHOTS, n + '.png'))
    pg.goto('file://' + os.path.join(ROOT, 'Vojvodca Stredozeme.html')); pg.wait_for_timeout(4000)
    try: pg.wait_for_function("typeof game !== 'undefined' && game.scene.getScenes(true).some(s => s.sys.settings.key === 'Intro')", timeout=30000)
    except Exception: pass
    E = pg.evaluate
    active = lambda: E("game.scene.getScenes(true).map(s => s.sys.settings.key).join(',')")
    check('Phaser načítaný', E("typeof Phaser !== 'undefined' && Phaser.VERSION"), E("Phaser.VERSION"))
    check('Renderer', True, E("game.renderer.type === Phaser.WEBGL ? 'WebGL' : 'Canvas'"))
    check('Úvod beží', 'Intro' in active(), active()); shot('1_uvod')
    shot('1b_menu'); pg.click('text=Nová hra'); pg.wait_for_timeout(500); shot('1c_tvorba'); pg.click('text=Vyraziť do boja'); pg.wait_for_timeout(800); shot('2_navod')
    clk = lambda t: E("t => { const b = [...document.querySelectorAll('#bt button')].find(b => b.textContent.trim().startsWith(t)); if (!b) return false; b.click(); return true; }", t)
    clk('Rozumiem'); pg.wait_for_timeout(300); clk('Na cestu'); pg.wait_for_timeout(1500)
    check('Mapa beží', 'Map' in active(), active()); shot('3_mapa')
    E("G.camp = 1"); pg.wait_for_timeout(3000); shot('4_mapa_cas')
    E("Z = .6"); pg.wait_for_timeout(800); shot('5_mapa_zoom')
    E("Z = 1; G.camp = 0; ov.classList.add('hide'); mode = 'map'; town(0)"); pg.wait_for_timeout(800); shot('6_hrad')
    E("tsub(0, 'r')"); pg.wait_for_timeout(500); shot('7_verbovanie')
    E("ov.classList.add('hide'); mode = 'map'; G.inf = 25; G.arc = 8; G.cav = 6; G.eq.w = SH[0].it.findIndex(i => i.fx === 'fire'); startBattle(E.find(e => hos(e.f, G.fac) && !e.nz))"); pg.wait_for_timeout(2500)
    check('Bitka beží', 'Battle' in active(), active()); shot('8_bitka')
    pg.wait_for_timeout(2500); shot('9_bitka_boj')
    E("U[0].hp = 1e9; for (const u of U) if (u.t) u.hp = 0"); pg.wait_for_timeout(1500); shot('10_koniec_bitky')
    clk('Prepustiť'); clk('Pokračovať'); pg.wait_for_timeout(500)
    E("ov.classList.add('hide'); mode = 'map'; G.inf = 30; const i = TW.findIndex(t => hos(t.f, G.fac) && t.f !== 9); siege(i); TW[i].sg.lad = 1; siegeMenu(i)"); pg.wait_for_timeout(500)
    clk('Zaútočiť'); pg.wait_for_timeout(2500)
    check('Obliehanie', 'Battle' in active() and E("!!SGB"), active()); shot('11_obliehanie')
    E("U[0].x = 900; U[0].y = 480"); pg.wait_for_timeout(1500); shot('12_obliehanie_brana')
    check('Žiadne chyby na stránke', not errs, errs[:5])
    b.close()
print('\nVšetky testy prešli.' if not fails else '\nZlyhalo: ' + ', '.join(fails))
sys.exit(1 if fails else 0)
