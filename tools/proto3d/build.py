# Zostaví tools/proto_3d_krcma.html: python3 tools/proto3d/pack.py model.glb tools/proto3d/data.js && python3 tools/proto3d/build.py
import os
D = os.path.dirname(os.path.abspath(__file__))
t = open(os.path.join(D, 'template.html'), encoding='utf-8').read(); d = open(os.path.join(D, 'data.js'), encoding='utf-8').read()
open(os.path.join(D, '..', 'proto_3d_krcma.html'), 'w', encoding='utf-8').write(t.replace('/*DATA*/', d))
