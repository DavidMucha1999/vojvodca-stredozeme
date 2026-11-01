# Vytiahne z GLB polia (pozície, UV, normály, indexy) a textúru ako JPEG; zapíše data.js pre ukážku.
import json, struct, base64, io, sys
from PIL import Image
f = open(sys.argv[1], 'rb').read()
cl, ct = struct.unpack('<II', f[12:20]); j = json.loads(f[20:20 + cl])
b0 = 20 + cl; bl, bt = struct.unpack('<II', f[b0:b0 + 8]); B = f[b0 + 8:b0 + 8 + bl]
def acc(i):
    a = j['accessors'][i]; v = j['bufferViews'][a['bufferView']]; o = v.get('byteOffset', 0) + a.get('byteOffset', 0)
    n = {'SCALAR': 1, 'VEC2': 2, 'VEC3': 3}[a['type']] * a['count']; sz = 4
    return B[o:o + n * sz], a
p = j['meshes'][0]['primitives'][0]
pos, _ = acc(p['attributes']['POSITION']); uv, _ = acc(p['attributes']['TEXCOORD_0']); nrm, _ = acc(p['attributes']['NORMAL']); idx, ia = acc(p['indices'])
ii = struct.unpack('<%dI' % ia['count'], idx); assert max(ii) < 65536
idx16 = struct.pack('<%dH' % len(ii), *ii)
blob = pos + uv + nrm + idx16
iv = j['bufferViews'][j['images'][0]['bufferView']]; png = B[iv.get('byteOffset', 0):iv.get('byteOffset', 0) + iv['byteLength']]
buf = io.BytesIO(); Image.open(io.BytesIO(png)).convert('RGB').save(buf, 'JPEG', quality=88); jpg = buf.getvalue()
nv = len(pos) // 12
open(sys.argv[2], 'w').write('const TAV = { nv: %d, ni: %d, bin: "%s", tex: "data:image/jpeg;base64,%s" };\n' % (nv, len(ii), base64.b64encode(blob).decode(), base64.b64encode(jpg).decode()))
print('verts', nv, 'idx', len(ii), 'bin', len(blob), 'jpg', len(jpg))
