# Scenario Bestanden - Overzicht

## ✅ Status: Alle bestanden correct verbonden!

## Locatie van Scenario Bestanden

Alle scenario JSON bestanden staan nu in de juiste map:

```
K:\Effab - Rumigen\Build\Effab_Rumigen_Textbase\scenarios\
├── ahmed_scenario.json
├── clara_scenario.json
├── emma_scenario.json
├── luca_scenario.json
└── sofia_scenario.json
```

## Hoe de Game de Scenarios Laadt

### 1. Pad Configuratie in script.js

```javascript
// Locatie: K:\Effab - Rumigen\Build\rumigen-demo-main\script.js
async function loadCharacterData(characterName) {
    const response = await fetch(`../Effab_Rumigen_Textbase/scenarios/${characterName}_scenario.json`);
    // ...
}
```

Dit pad werkt als volgt:
- **script.js** staat in: `Build/rumigen-demo-main/`
- **../** gaat één map omhoog naar: `Build/`
- Dan naar: `Effab_Rumigen_Textbase/scenarios/`

### 2. Scenario Structuur

Elk scenario bestand heeft de volgende structuur:

```json
{
  "CharacterName": {
    "character": {
      "name": "Character Name",
      "role": "Their Role",
      "bio": "Biography...",
      "music": "Audio/Character_Song.mp3"
    },
    "intro": {
      "text": "Intro text...",
      "background": "office",
      "parallaxEffect": "scroll-left"
    },
    "questions": [
      {
        "number": 1,
        "location": "Location Name",
        "background": "supermarket",
        "parallaxEffect": "scroll-left",
        "context": "Character says: ...",
        "text": "Question?",
        "options": {
          "A": "Option A text",
          "B": "Option B text",
          "C": "Option C text"
        },
        "tradeoffs": {
          "A": {
            "title": "Character's Choice: Option A",
            "text": "Payoff text...",
            "payoffParallaxEffect": "zoom-gentle"
          }
        },
        "scoring": {
          "A": 3,
          "B": 2,
          "C": 1
        }
      }
    ]
  }
}
```

### 3. Audio Koppeling

Voor elk scenario worden automatisch de bijbehorende voice overs geladen:

```
Voice Overs/
├── EMMA/
│   ├── EMMA_INTRO.mp3              ← intro audio
│   ├── EMMA_Q01_Shopping_District.mp3  ← vraag context
│   ├── EMMA_Q01_Payoff_A.mp3       ← payoff A
│   ├── EMMA_Q01_Payoff_B.mp3       ← payoff B
│   └── EMMA_Q01_Payoff_C.mp3       ← payoff C
```

## Wat er nu Werkt

✅ **Character Selectie**
- Alle 5 karakters (Emma, Luca, Clara, Ahmed, Sofia) kunnen worden geselecteerd

✅ **Intro Scherm**
- Toont character bio
- Toont intro tekst met achtergrond
- Speelt intro audio af met lip-sync

✅ **Vragen**
- Laadt 8 vragen per character
- Toont locatie en context
- Speelt vraag audio af met lip-sync
- Toont 3 antwoordopties

✅ **Payoffs**
- Toont tradeoff tekst na keuze
- Speelt payoff audio af met lip-sync
- Wisselt naar payoff achtergrond

✅ **Score Tracking**
- Berekent totale score
- Bepaalt toekomstig scenario (High-Tech, Precautionary, of Pastoral)

## File Overzicht

### Scenario Bestanden (JSON)
| Bestand | Character | Vragen | Status |
|---------|-----------|--------|--------|
| emma_scenario.json | Emma | 8 | ✅ |
| luca_scenario.json | Luca | 8 | ✅ |
| clara_scenario.json | Clara | 8 | ✅ |
| ahmed_scenario.json | Dr. Ahmed | 8 | ✅ |
| sofia_scenario.json | Sofia | 8 | ✅ |

### Voice Over Bestanden (MP3)
- **5 karakters** × 33 bestanden = **165 audio bestanden** ✅
  - 1 intro per character
  - 8 vraag contexts
  - 24 payoffs (8 vragen × 3 opties)

### Verificatie Scripts
- `test-audio-files.ps1` - Controleert alle audio bestanden
- `verify-scenario-setup.ps1` - Controleert scenario configuratie

## Nieuwe Characters of Vragen Toevoegen

### Een Nieuw Character Toevoegen:

1. **Maak scenario JSON** in `Build/Effab_Rumigen_Textbase/scenarios/`
   ```
   newcharacter_scenario.json
   ```

2. **Voeg voice overs toe** in `Build/rumigen-demo-main/Voice Overs/`
   ```
   NEWCHARACTER/
   ├── NEWCHARACTER_INTRO.mp3
   ├── NEWCHARACTER_Q01_Location.mp3
   └── ...
   ```

3. **Update character selectie** in `index.html`

### Een Vraag Toevoegen aan Bestaand Character:

1. **Voeg vraag toe** aan scenario JSON
2. **Voeg audio toe**:
   - `CHARACTER_Q09_Location.mp3` (context)
   - `CHARACTER_Q09_Payoff_A.mp3` (payoff A)
   - `CHARACTER_Q09_Payoff_B.mp3` (payoff B)
   - `CHARACTER_Q09_Payoff_C.mp3` (payoff C)

3. **Voer verificatie uit**:
   ```powershell
   .\verify-scenario-setup.ps1
   ```

## Troubleshooting

### Character laadt niet
1. Check of scenario bestand bestaat in `scenarios/` map
2. Check bestandsnaam: moet `charactername_scenario.json` zijn (lowercase)
3. Valideer JSON syntax

### Audio speelt niet
1. Check of audio bestand bestaat in `Voice Overs/` map
2. Check bestandsnaam conventie
3. Voer `test-audio-files.ps1` uit

### Intro scherm toont niet correct
1. Check of `intro` object bestaat in scenario JSON
2. Check of `intro.text`, `intro.background` en `intro.parallaxEffect` ingevuld zijn

## Laatste Verificatie

Uitvoer van verificatie script:
```
✅ Emma - 8 vragen - Intro ✓ - Audio ✓
✅ Luca - 8 vragen - Intro ✓ - Audio ✓
✅ Clara - 8 vragen - Intro ✓ - Audio ✓
✅ Ahmed - 8 vragen - Intro ✓ - Audio ✓
✅ Sofia - 8 vragen - Intro ✓ - Audio ✓
✅ Script.js pad correct
```

**Alles is correct verbonden en klaar voor gebruik!** 🎉
