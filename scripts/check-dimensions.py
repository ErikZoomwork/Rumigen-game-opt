import re, os

def get_viewbox(path):
    with open(path, encoding='utf-8') as f:
        content = f.read(2000)
    m = re.search(r'viewBox="([^"]+)"', content)
    vb = m.group(1).strip() if m else '?'
    w = re.search(r'\bwidth="([\d\.]+)"', content)
    h = re.search(r'\bheight="([\d\.]+)"', content)
    return vb, (w.group(1) if w else '?'), (h.group(1) if h else '?')

base = r'k:\Effab Rumigen - Game\SVG\backgrounds'

print("=== Nieuwe eindscenario achtergronden ===")
for scene in ['agro', 'hightech', 'modern']:
    folder = os.path.join(base, scene)
    for fn in sorted(os.listdir(folder)):
        path = os.path.join(folder, fn)
        vb, w, h = get_viewbox(path)
        parts = vb.split() if vb != '?' else []
        width = parts[2] if len(parts) == 4 else w
        height = parts[3] if len(parts) == 4 else h
        print(f"  {fn}: viewBox={vb}  (w={width}, h={height})")

print()
print("=== Bestaande achtergronden ===")
for scene in sorted(os.listdir(base)):
    sp = os.path.join(base, scene)
    if os.path.isdir(sp) and scene not in ['agro', 'hightech', 'modern']:
        for fn in sorted(os.listdir(sp))[:1]:
            vb, w, h = get_viewbox(os.path.join(sp, fn))
            parts = vb.split() if vb != '?' else []
            width = parts[2] if len(parts) == 4 else w
            height = parts[3] if len(parts) == 4 else h
            print(f"  [{scene}] {fn}: viewBox={vb}  (w={width}, h={height})")
