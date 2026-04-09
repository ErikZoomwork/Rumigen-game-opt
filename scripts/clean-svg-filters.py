"""Remove SVG filter/mask/blend-mode operations from all character SVG files.
These are purely cosmetic luminosity-noclip shadows/highlights that cause GPU overload on mobile.
"""
import re
import os
import glob


def clean_svg(content):
    # Remove <filter ...>...</filter> blocks (including self-closing)
    content = re.sub(r'<filter\b[^>]*/>', '', content)
    content = re.sub(r'<filter\b[^>]*>.*?</filter>', '', content, flags=re.DOTALL)

    # Remove <mask ...>...</mask> blocks (including self-closing)
    content = re.sub(r'<mask\b[^>]*/>', '', content)
    content = re.sub(r'<mask\b[^>]*>.*?</mask>', '', content, flags=re.DOTALL)

    # Remove mix-blend-mode from style attributes
    content = re.sub(r';\s*mix-blend-mode\s*:\s*[^;"]+', '', content)
    content = re.sub(r'mix-blend-mode\s*:\s*[^;"]+;?\s*', '', content)

    # Remove mask: url(...) from style attributes
    content = re.sub(r';\s*mask\s*:\s*url\([^)]+\)', '', content)
    content = re.sub(r'mask\s*:\s*url\([^)]+\);?\s*', '', content)

    # Remove filter: url(...) from style attributes
    content = re.sub(r';\s*filter\s*:\s*url\([^)]+\)', '', content)
    content = re.sub(r'filter\s*:\s*url\([^)]+\);?\s*', '', content)

    # Remove standalone mask= attribute on elements
    content = re.sub(r'\s+mask="url\([^)]+\)"', '', content)

    # Clean up empty style attributes left behind
    content = re.sub(r'\s+style="\s*"', '', content)
    content = re.sub(r'\s+style="\s*;+\s*"', '', content)

    return content


def count_ops(content):
    return len(re.findall(r'<filter|<mask|mix-blend-mode', content))


base = r'k:\Effab Rumigen - Game\SVG\characters'
dry_run = False  # Set to True to preview without writing

total_before = 0
total_after = 0

for char in ['Ahmed', 'Emma', 'Luca', 'Clara', 'Sofia']:
    char_before = 0
    char_after = 0
    for svg_path in sorted(glob.glob(os.path.join(base, char, '*.svg'))):
        with open(svg_path, 'r', encoding='utf-8') as f:
            content = f.read()
        before = count_ops(content)
        cleaned = clean_svg(content)
        after = count_ops(cleaned)
        char_before += before
        char_after += after
        if not dry_run:
            with open(svg_path, 'w', encoding='utf-8') as f:
                f.write(cleaned)
        print(f'  {os.path.basename(svg_path)}: {before} -> {after}')
    print(f'{char}: {char_before} -> {char_after} ops')
    total_before += char_before
    total_after += char_after

print(f'\nTotal: {total_before} -> {total_after} ops removed: {total_before - total_after}')
