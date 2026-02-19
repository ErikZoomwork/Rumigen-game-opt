# Voice Over Systeem - Documentatie

## Overzicht

Het voice over systeem is nu volledig dynamisch en laadt automatisch de juiste audio bestanden op basis van:
- Het geselecteerde karakter (Emma, Luca, Clara, Ahmed, Sofia)
- Het vraagnummer (Q01 t/m Q08)
- De locatie/context van de vraag
- De gekozen antwoordoptie (A, B, of C)

## Bestandsstructuur

Alle voice over bestanden bevinden zich in:
```
Voice Overs/
├── AHMED/
├── CLARA/
├── EMMA/
├── LUCA/
└── SOFIA/
```

### Bestandsnaam Conventie

Elk karakter heeft de volgende audio bestanden:

1. **Intro bestand**: `{CHARACTER}_INTRO.mp3`
   - Voorbeeld: `EMMA_INTRO.mp3`
   - Wordt afgespeeld bij het starten van het karakter

2. **Vraag context bestanden**: `{CHARACTER}_Q{NUMBER}_{LOCATION}.mp3`
   - Voorbeeld: `EMMA_Q01_Shopping_District.mp3`
   - Wordt afgespeeld bij het tonen van een vraag
   - Locatienaam: spaties worden underscores, speciale tekens verwijderd

3. **Payoff bestanden**: `{CHARACTER}_Q{NUMBER}_Payoff_{OPTION}.mp3`
   - Voorbeeld: `EMMA_Q01_Payoff_A.mp3`
   - Wordt afgespeeld na het kiezen van een antwoord
   - Opties: A, B, of C

## Totaal Audio Bestanden per Karakter

Per karakter zijn er:
- 1 intro bestand
- 8 vraag context bestanden (Q01-Q08)
- 24 payoff bestanden (8 vragen × 3 opties)
- **Totaal: 33 bestanden per karakter**

**Voor alle 5 karakters: 165 audio bestanden** ✓ (allemaal aanwezig!)

## Technische Implementatie

### Dynamische Audio Functies

De volgende JavaScript functies genereren automatisch de juiste audio paden:

```javascript
// Intro audio
getIntroAudioPath(characterName)
// Returns: "Voice Overs/EMMA/EMMA_INTRO.mp3"

// Vraag context audio
getQuestionAudioPath(characterName, questionNumber, location)
// Returns: "Voice Overs/EMMA/EMMA_Q01_Shopping_District.mp3"

// Payoff audio
getPayoffAudioPath(characterName, questionNumber, option)
// Returns: "Voice Overs/EMMA/EMMA_Q01_Payoff_A.mp3"
```

### Audio Laden

Het systeem laadt audio automatisch op de juiste momenten:

1. **Bij karakter selectie**: Intro audio wordt geladen
2. **Bij elke vraag**: Context audio voor die vraag wordt geladen
3. **Bij antwoord keuze**: Payoff audio voor die keuze wordt geladen

### Lip-Sync Animatie

De audio is gekoppeld aan de lip-sync animatie van het karakter:
- Analyseert real-time de audio frequenties
- Switcht tussen verschillende mond posities (rest, E, AI)
- Handelt automatisch knipperingen af

## Audio Validatie

Gebruik het meegeleverde PowerShell script om te controleren of alle audio bestanden aanwezig zijn:

```powershell
cd "K:\Effab - Rumigen\Build\rumigen-demo-main"
.\test-audio-files.ps1
```

Dit script:
- Controleert alle 165 audio bestanden
- Toont welke bestanden gevonden/ontbrekend zijn
- Geeft een overzichtelijke samenvatting

## Nieuwe Audio Toevoegen

Als je nieuwe audio wilt toevoegen:

1. Gebruik de correcte bestandsnaam conventie
2. Plaats het bestand in de juiste character folder
3. Voer het validatie script uit om te controleren
4. Het systeem laadt de audio automatisch!

### Voorbeeld: Nieuwe Vraag Toevoegen

Als je vraag 9 toevoegt voor Emma:

```
Voice Overs/EMMA/
├── EMMA_Q09_New_Location.mp3       (context)
├── EMMA_Q09_Payoff_A.mp3           (antwoord A)
├── EMMA_Q09_Payoff_B.mp3           (antwoord B)
└── EMMA_Q09_Payoff_C.mp3           (antwoord C)
```

Update vervolgens het scenario JSON bestand met de nieuwe vraag.

## Voordelen van het Nieuwe Systeem

✓ **Volledig automatisch**: Geen hardcoded audio paden meer
✓ **Makkelijk uitbreidbaar**: Voeg nieuwe karakters of vragen toe
✓ **Consistente naamgeving**: Duidelijke conventie voor alle bestanden
✓ **Foutbestendig**: Logt ontbrekende bestanden in de console
✓ **Gevalideerd**: Alle 165 bestanden zijn aanwezig en correct benoemd

## Troubleshooting

### Audio wordt niet afgespeeld

1. Open browser console (F12)
2. Zoek naar `Loaded voice audio:` of `Loaded payoff audio:` berichten
3. Controleer of het pad correct is
4. Voer validatie script uit om ontbrekende bestanden te vinden

### Verkeerde audio wordt afgespeeld

- Controleer of de `location` in het scenario JSON overeenkomt met de bestandsnaam
- Locaties met spaties worden underscores in bestandsnamen
- Speciale tekens worden verwijderd

### Audio laadt niet voor nieuw karakter

- Zorg dat de character folder bestaat in `Voice Overs/`
- Naam moet volledig UPPERCASE zijn (EMMA, LUCA, etc.)
- Alle 33 bestanden moeten aanwezig zijn
