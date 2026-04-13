# Actieplan – Feedbackverwerking RUMIGEN

> Gebaseerd op de verzamelde feedback van de projectpartners (ontvangen maart 2026).
> *(Videopunten vallen buiten dit project en zijn hier niet opgenomen.)*

---

## Simulatiespel

### 1. Disclaimer – Vervang het woord "extreme"
- **Actie:** Vervang in de disclaimer het woord *"extreme"* (verwijzend naar de personages) door *"archetypes"* of *"stereotypes"*
- **Bestand:** Disclaimer-tekst in `index.html` / `script.js` of relevante data-bestanden

### 2. Disclaimer – Beslissing: verwijzing naar "drie scenario's" ⚠️
- **Actie vereist:** Beslissen of de verwijzing naar de drie scenario's behouden of verwijderd wordt
- **Argument voor verwijderen:** Spelplezier en gevoel van open keuzes gaan verloren als de speler vooraf weet dat er slechts drie uitkomsten zijn
- **Argument voor behouden:** Geeft context en sluit aan bij de scenariovideo's
- **Zie ook:** Stap 7 — de scenariovideo's zijn alleen relevant als deze verwijzing behouden blijft

### 3. Clara's verhaal – Tekst en audio synchroniseren
- **Actie:** Controleer en herstel de afstemming tussen de tekst op het scherm en de voice-over van Clara
- **Probleem:** Tekst op scherm komt niet volledig overeen met wat Clara zegt; bij de andere personages is dit consistent
- **Bestanden om te controleren:**
  - `data/scenarios/clara_scenario.json`
  - `assets/audio/voice-overs/CLARA/`

### 4. Resultatenblok visueel verbeteren
- **Actie:** Herschrijf en herstructureer de resultatensectie aan het einde van het spel
- **Doel:** Minder dichte tekstblokken, meer overzicht en visuele aantrekkelijkheid
- **Suggesties:**
  - Splits lange alinea's op in kortere secties
  - Gebruik opsommingstekens (bullet points)
  - Voeg iconen of eenvoudige visuele elementen toe
- **Bestanden:** Resultaten-HTML/CSS in `index.html` en `styles.css`

---

## Optioneel (alleen relevant als verwijzing naar scenario's behouden blijft)

### 5. Scenariovideo's toevoegen aan het spel
- **Actie:** Embed de drie scenariovideo's die horen bij de drie uitkomsten
  - Scenario 1: https://www.youtube.com/watch?v=UogGt2VGHg8
  - Scenario 2: https://www.youtube.com/watch?v=5amUwCMGYSM
  - Scenario 3: https://www.youtube.com/watch?v=9ET611gYl-g
- **Aanvullende actie (kies één):**
  - Optie A: Verwijder de Nederlandstalige voice-over uit de video's
  - Optie B: Voeg Engelse ondertitels toe aan de video's
- **Afhankelijkheid:** Alleen uitvoeren als besloten wordt de drie scenario's te benoemen (zie Stap 2)

---

## Overzicht acties

| # | Onderdeel | Actie | Prioriteit |
|---|-----------|-------|------------|
| 1 | Spel – Disclaimer | "Extreme" vervangen door "archetypes/stereotypes" | Middel |
| 2 | Spel – Disclaimer | Beslissing: scenario's noemen of niet | Beslissing vereist |
| 3 | Spel – Clara | Tekst en audio synchroniseren | Middel |
| 4 | Spel – Resultaten | Visueel en tekstueel verbeteren | Middel |
| 5 | Spel – Optioneel | Scenariovideo's toevoegen | Optioneel |
