"""
Optimaliseer SVG bestanden in 'Eindscenarios Achtergronden':
Verwijder alle verborgen <g> elementen (display:none) volledig uit het bestand.
"""

import xml.etree.ElementTree as ET
import os
import shutil
import re

FOLDER = r"k:\Effab Rumigen - Game\Werk Map\Eindscenarios Achtergronden"
BACKUP_FOLDER = r"k:\Effab Rumigen - Game\Werk Map\Eindscenarios Achtergronden\backup_originals"

# Zorg voor namespace-behoud
ET.register_namespace('', 'http://www.w3.org/2000/svg')
ET.register_namespace('xlink', 'http://www.w3.org/1999/xlink')
ET.register_namespace('dc', 'http://purl.org/dc/elements/1.1/')
ET.register_namespace('cc', 'http://creativecommons.org/ns#')
ET.register_namespace('rdf', 'http://www.w3.org/1999/02/22-rdf-syntax-ns#')
ET.register_namespace('svg', 'http://www.w3.org/2000/svg')
ET.register_namespace('sodipodi', 'http://sodipodi.sourceforge.net/DTD/sodipodi-0.0.dtd')
ET.register_namespace('inkscape', 'http://www.inkscape.org/namespaces/inkscape')

def is_display_none(element):
    style = element.get('style', '')
    display = element.get('display', '')
    if 'display:none' in style.replace(' ', '') or display == 'none':
        return True
    return False

def collect_ids_recursive(element, ids):
    eid = element.get('id')
    if eid:
        ids.add(eid)
    for child in element:
        collect_ids_recursive(child, ids)

def remove_hidden_groups(svg_path):
    # Lees ruwe content voor namespace-informatie
    with open(svg_path, 'r', encoding='utf-8') as f:
        raw = f.read()

    # Parse de XML
    # Gebruik re om namespaces te bewaren via de methode met iterparse
    tree = ET.parse(svg_path)
    root = tree.getroot()

    def ns_tag(tag):
        return tag.split('}')[1] if '}' in tag else tag

    hidden_ids = set()
    to_remove = []

    # Zoek alle verborgen groepen in alle ouder-elementen recursief
    def find_hidden(parent):
        for child in list(parent):
            if ns_tag(child.tag) == 'g' and is_display_none(child):
                to_remove.append((parent, child))
                collect_ids_recursive(child, hidden_ids)
            else:
                find_hidden(child)

    find_hidden(root)

    if not to_remove:
        print(f"  Geen verborgen groepen gevonden.")
        return 0, 0

    removed_count = len(to_remove)
    print(f"  Verwijder {removed_count} verborgen groep(en): {[r[1].get('id','?') for r in to_remove]}")

    for parent, child in to_remove:
        parent.remove(child)

    return removed_count, hidden_ids

def optimize_file(svg_path):
    filename = os.path.basename(svg_path)
    original_size = os.path.getsize(svg_path) / 1024

    print(f"\n{filename} ({original_size:.0f} KB):")

    # Maak backup
    os.makedirs(BACKUP_FOLDER, exist_ok=True)
    backup_path = os.path.join(BACKUP_FOLDER, filename)
    if not os.path.exists(backup_path):
        shutil.copy2(svg_path, backup_path)
        print(f"  Backup aangemaakt.")

    # Lees en parse
    with open(svg_path, 'r', encoding='utf-8') as f:
        raw = f.read()

    # -- Strategie: gebruik regex om hele <g id="..." style="display: none;"> blokken te vinden en verwijderen --
    # We zoeken naar <g ... display: none ...> tot de bijbehorende </g>
    # Dit is betrouwbaarder voor grote bestanden

    # Vind alle top-level hidden groups via XML parse voor ID identificatie
    tree = ET.parse(svg_path)
    root = tree.getroot()

    def ns_tag(tag):
        return tag.split('}')[1] if '}' in tag else tag

    hidden_group_ids = []
    def find_hidden_ids(parent):
        for child in list(parent):
            if ns_tag(child.tag) == 'g' and is_display_none(child):
                gid = child.get('id')
                if gid:
                    hidden_group_ids.append(gid)
            else:
                find_hidden_ids(child)

    find_hidden_ids(root)

    if not hidden_group_ids:
        print(f"  Geen verborgen groepen gevonden.")
        return

    print(f"  Verborgen groepen: {hidden_group_ids}")

    # Verwijder elk verborgen blok via string-manipulatie (betrouwbaarder voor grote SVGs)
    cleaned = raw
    removed_any = False

    for gid in hidden_group_ids:
        # Match de opening tag met dit id en display:none
        # Pattern: <g ... id="GID" ... style="display: none;"> ... </g>
        # We zoeken de exacte <g> tag start en tellen dan geneste </g> tags
        
        # Zoek de positie van de groep
        pattern = re.compile(r'<g\b[^>]*\bid=["\']' + re.escape(gid) + r'["\'][^>]*>')
        match = pattern.search(cleaned)
        if not match:
            # Probeer omgekeerde volgorde van id en style
            pattern2 = re.compile(r'<g\b[^>]*style=["\'][^"\']*display\s*:\s*none[^"\']*["\'][^>]*\bid=["\']' + re.escape(gid) + r'["\'][^>]*>')
            match = pattern2.search(cleaned)

        if not match:
            print(f"  WAARSCHUWING: Kon groep '{gid}' niet vinden via regex.")
            continue

        start = match.start()
        # Zoek het overeenkomende </g> door nesting level bij te houden
        pos = match.end()
        depth = 1
        while depth > 0 and pos < len(cleaned):
            open_match = re.search(r'<g[\s>]', cleaned[pos:])
            close_match = re.search(r'</g>', cleaned[pos:])
            
            if close_match is None:
                break
            if open_match is not None and open_match.start() < close_match.start():
                depth += 1
                pos += open_match.start() + 1
            else:
                depth -= 1
                if depth == 0:
                    end = pos + close_match.start() + len('</g>')
                    # Verwijder het volledige blok inclusief eventuele newline erna
                    block_to_remove = cleaned[start:end]
                    if end < len(cleaned) and cleaned[end] == '\n':
                        end += 1
                    cleaned = cleaned[:start] + cleaned[end:]
                    removed_any = True
                    print(f"  Verwijderd: <g id=\"{gid}\"> (was {len(block_to_remove)//1024} KB)")
                    break
                pos += close_match.start() + len('</g>')

    if removed_any:
        with open(svg_path, 'w', encoding='utf-8') as f:
            f.write(cleaned)
        new_size = os.path.getsize(svg_path) / 1024
        saved = original_size - new_size
        print(f"  Resultaat: {original_size:.0f} KB → {new_size:.0f} KB (bespaard: {saved:.0f} KB, {saved/original_size*100:.0f}%)")
    else:
        print(f"  Geen wijzigingen aangebracht.")


if __name__ == '__main__':
    print("=== SVG Optimalisatie: Eindscenarios Achtergronden ===\n")
    svg_files = [f for f in os.listdir(FOLDER) if f.endswith('.svg')]
    svg_files.sort()
    
    total_before = 0
    total_after = 0
    
    for filename in svg_files:
        path = os.path.join(FOLDER, filename)
        total_before += os.path.getsize(path)
        optimize_file(path)
        total_after += os.path.getsize(path)
    
    print(f"\n=== TOTAAL ===")
    print(f"Voor:  {total_before/1024/1024:.1f} MB")
    print(f"Na:    {total_after/1024/1024:.1f} MB")
    print(f"Bespaard: {(total_before-total_after)/1024/1024:.1f} MB ({(total_before-total_after)/total_before*100:.0f}%)")
    print(f"\nOriginelen opgeslagen in: {BACKUP_FOLDER}")
