# Hoe voeg je een nieuwe achtergrond toe? 🎨

**Volledig automatisch systeem - geen handmatige JSON editing nodig!**

Het systeem scant automatisch je folders en genereert de configuratie.

---

## ✅ Snelle Start (3 stappen)

### 1️⃣ Maak een folder aan
Maak een folder met de achtergrond naam in `SVG/backgrounds/`:
```
SVG/backgrounds/
├── supermarket/
├── farmers-market/
├── office/
└── jouw-nieuwe-achtergrond/    ← NIEUW!
```

### 2️⃣ Voeg SVG bestanden toe
Plaats SVG bestanden met deze naamgeving:
```
[achtergrondnaam]-layer-[01-99]-[beschrijving].svg
```

**Voorbeeld voor "park":**
```
park-layer-01-sky.svg
park-layer-02-trees-back.svg
park-layer-03-grass.svg
park-layer-04-bench.svg
park-layer-05-flowers.svg
```

### 3️⃣ Run het genereer script
Open PowerShell in `SVG/backgrounds/` en run:
```powershell
.\generate-backgrounds-json.ps1
```

**Dat is alles!** Het script:
- ✅ Scant automatisch alle folders
- ✅ Leest alle SVG bestanden
- ✅ Genereert `backgrounds.json`
- ✅ Wijst parallax snelheden toe

---

## 📖 Uitgebreide Handleiding

### Naamgeving Regels

**Belangrijk - volg exact deze structuur:**

```
[foldernaam]-layer-[XX]-[beschrijving].svg
```

**✅ Correct:**
- `office-layer-01-sky.svg`
- `office-layer-02-clouds.svg`
- `park-layer-03-trees-back.svg`

**❌ Fout:**
- `office-layer-1-sky.svg` (gebruik altijd 2 cijfers: 01 niet 1)
- `Office-layer-01-sky.svg` (gebruik kleine letters)
- `layer-01-sky.svg` (vergeet de foldernaam niet)
- `office_layer_01_sky.svg` (gebruik streepjes, niet underscores)

### Layer Nummers Betekenis

Lagere nummers = achtergrond = langzamere parallax

| Layer | Typisch Gebruik | Parallax Snelheid |
|-------|----------------|-------------------|
| 01 | Lucht, hemel | Bijna statisch |
| 02 | Wolken, verre bergen | Heel traag |
| 03 | Gebouwen achtergrond | Traag |
| 04 | Hoofdelementen | Normaal |
| 05 | Decoratieve objecten | Medium-snel |
| 06 | Nabije elementen | Snel |
| 07 | Planten, voorgrond | Heel snel |

**Automatische LayerClass Toewijzing:**

Het script wijst automatisch deze parallax classes toe:

```
Layer 01 → layer-6 (bijna statisch)
Layer 02 → layer-5 (heel traag)
Layer 03 → layer-4 (traag)
Layer 04 → layer-3 (normaal)
Layer 05 → layer-7 (medium-snel)
Layer 06 → layer-2 (snel)
Layer 07 → layer-1 (heel snel)
```

### Script Output Voorbeeld

```
Scanning for background folders...
  Found: farmers-market
    Layer 1 : sky (layer-6)
    Layer 2 : clouds (layer-5)
    Layer 3 : stalls-back (layer-4)
    Layer 4 : market-front (layer-3)
    Layer 5 : objects (layer-7)
    Layer 6 : foreground (layer-2)
    Layer 7 : plants (layer-1)
  Found: office
    Layer 1 : sky (layer-6)
    Layer 2 : clouds (layer-5)

Generated backgrounds.json with 3 backgrounds!
```

### Achtergrond Gebruiken in Scenario

Nadat je het script hebt gerund, gebruik je de achtergrond naam in je scenario:

**Bestand:** `Build/Effab_Rumigen_Textbase/scenarios/emma_scenario.json`
```json
{
  "name": "Emma's Journey",
  "background": "office",
  ...
}
```

De `background` waarde moet exact dezelfde zijn als de folder naam.

---

## 🔧 Problemen Oplossen

### Achtergrond laadt niet
1. Check de browser console (F12) voor fouten
2. Controleer of bestandsnamen exact kloppen met de folder naam
3. Run het script opnieuw na het toevoegen van bestanden

### SVG bestanden worden niet gevonden
- Zorg dat je 2 cijfers gebruikt (01, 02, niet 1, 2)
- Check of de folder niet in `_Unused` staat (wordt geskipped)
- Controleer of bestanden echt `.svg` extensie hebben

### Parallax werkt niet goed
- Layer 01-02 moeten de achtergrond zijn (lucht/wolken)
- Layer 06-07 moeten de voorgrond zijn (planten/objecten)
- Run het script opnieuw om de juiste layerClass toe te wijzen

---

## 💡 Tips & Best Practices

**Voor Designers:**
- Start altijd met lucht/wolken (layer 01-02)
- Gebruik consistente kleuren tussen layers
- Houd layer bestanden klein (optimize SVG)
- Test met 2-3 layers eerst voordat je alle 7 toevoegt

**Voor Developers:**
- Run het script na elke wijziging
- Check `backgrounds.json` na het runnen
- Test in de browser met verschillende scenarios
- Gebruik browser DevTools om layer volgorde te checken

**Performance:**
- Minder layers = sneller laden
- Optimaliseer SVG bestanden (verwijder onnodige metadata)
- Gebruik simpele shapes waar mogelijk

---

## 📁 Folder Structuur Voorbeeld

```
SVG/backgrounds/
│
├── generate-backgrounds-json.ps1   ← Run dit script
├── backgrounds.json                ← Wordt automatisch gegenereerd
│
├── supermarket/
│   ├── supermarket-layer-01-sky.svg
│   ├── supermarket-layer-02-clouds.svg
│   ├── supermarket-layer-03-buildings-back.svg
│   ├── supermarket-layer-04-shops-front.svg
│   └── supermarket-layer-05-objects.svg
│
├── farmers-market/
│   ├── farmers-market-layer-01-sky.svg
│   ├── farmers-market-layer-02-clouds.svg
│   ├── farmers-market-layer-03-stalls-back.svg
│   ├── farmers-market-layer-04-market-front.svg
│   ├── farmers-market-layer-05-objects.svg
│   ├── farmers-market-layer-06-foreground.svg
│   └── farmers-market-layer-07-plants.svg
│
└── office/
    ├── office-layer-01-sky.svg
    └── office-layer-02-clouds.svg
```

---

## 🎯 Samenvatting

1. **Maak folder** in `SVG/backgrounds/`
2. **Voeg SVG's toe** met correcte naamgeving
3. **Run script**: `.\generate-backgrounds-json.ps1`
4. **Gebruik in scenario**: zet `"background": "jouw-folder-naam"`
5. **Klaar!** Geen HTML of JavaScript aanpassen nodig

Het systeem doet de rest automatisch! 🚀
