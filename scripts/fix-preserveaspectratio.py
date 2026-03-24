import os

base = r"k:\Effab Rumigen - Game\SVG\backgrounds"
scenes = ["agro", "hightech", "modern"]
fixed = 0
for scene in scenes:
    folder = os.path.join(base, scene)
    for fn in sorted(os.listdir(folder)):
        if not fn.endswith(".svg"):
            continue
        path = os.path.join(folder, fn)
        with open(path, "r", encoding="utf-8") as f:
            content = f.read()
        # For pan effect: xMinYMid meet renders full width at natural proportions
        # object-position then controls which part of the full image is visible
        if 'preserveAspectRatio="xMidYMid slice"' in content:
            content = content.replace(
                'preserveAspectRatio="xMidYMid slice"',
                'preserveAspectRatio="xMinYMid meet"'
            )
            with open(path, "w", encoding="utf-8") as f:
                f.write(content)
            print(f"  Updated: {fn}")
            fixed += 1
        elif 'preserveAspectRatio' not in content:
            old = 'viewBox="0 0 14760 1900"'
            new = 'viewBox="0 0 14760 1900" preserveAspectRatio="xMinYMid meet"'
            content = content.replace(old, new, 1)
            with open(path, "w", encoding="utf-8") as f:
                f.write(content)
            print(f"  Added: {fn}")
            fixed += 1
        else:
            print(f"  Already OK: {fn}")
print(f"\nKlaar. {fixed} bestanden aangepast.")
