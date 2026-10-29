"""
Zostaví celú hru do jedného HTML súboru (dist/).
Použitie: python tools/build_single.py [phaser.html|index.html]
Výsledok sa dá otvoriť priamo, poslať alebo zverejniť ako jeden súbor.
"""
import os, re, sys
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
src = sys.argv[1] if len(sys.argv) > 1 else 'phaser.html'
html = open(os.path.join(ROOT, src), encoding='utf-8').read()

def inline_css(m):
    return '<style>\n' + open(os.path.join(ROOT, m.group(1)), encoding='utf-8').read() + '\n</style>'

def inline_js(m):
    code = open(os.path.join(ROOT, m.group(1)), encoding='utf-8').read().replace('</script>', '<\\/script>')
    return '<script>\n' + code + '\n</script>'

html = re.sub(r'<link rel="stylesheet" href="(css/[^"]+)">', inline_css, html)
html = re.sub(r'<script src="((?:js|assets|vendor)/[^"]+)"></script>', inline_js, html)
os.makedirs(os.path.join(ROOT, 'dist'), exist_ok=True)
out = os.path.join(ROOT, 'dist', os.path.splitext(os.path.basename(src))[0] + '-single.html')
open(out, 'w', encoding='utf-8').write(html)
print(out, len(html.encode()), 'B')
