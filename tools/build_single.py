"""
Zostaví celú hru do jedného HTML súboru (dist/).
Použitie: python tools/build_single.py ["Vojvodca Stredozeme.html"]
Výsledok sa dá otvoriť priamo, poslať alebo zverejniť ako jeden súbor.
"""
import os, re, sys
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
src = sys.argv[1] if len(sys.argv) > 1 else 'Vojvodca Stredozeme.html'
html = open(os.path.join(ROOT, src), encoding='utf-8').read()

def inline_css(m):
    return '<style>\n' + open(os.path.join(ROOT, m.group(1)), encoding='utf-8').read() + '\n</style>'

def inline_js(m):
    code = open(os.path.join(ROOT, m.group(1)), encoding='utf-8').read().replace('</script>', '<\\/script>')
    return '<script>\n' + code + '\n</script>'

import base64
def inline_icon(m):
    data = base64.b64encode(open(os.path.join(ROOT, m.group(1)), 'rb').read()).decode()
    return '<link rel="icon" type="image/png" href="data:image/png;base64,' + data + '">'

html = re.sub(r'<link rel="icon" type="image/png" href="(assets/[^"]+)">', inline_icon, html)
html = re.sub(r'<link rel="stylesheet" href="(css/[^"]+)">', inline_css, html)
html = re.sub(r'<script src="((?:js|assets|vendor)/[^"]+)"></script>', inline_js, html)
os.makedirs(os.path.join(ROOT, 'dist'), exist_ok=True)
out = os.path.join(ROOT, 'dist', 'vojvodca-single.html')
open(out, 'w', encoding='utf-8').write(html)
print(out, len(html.encode()), 'B')
