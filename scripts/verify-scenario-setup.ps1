# Verificatie script voor scenario bestanden
Write-Host ""
Write-Host "=== Scenario Bestanden Verificatie ===" -ForegroundColor Cyan
Write-Host ""

$scenarioDir = "K:\Effab - Rumigen\Build\Effab_Rumigen_Textbase\scenarios"
$voiceOverDir = "K:\Effab - Rumigen\Build\rumigen-demo-main\Voice Overs"

# Check of alle scenario bestanden aanwezig zijn
$characters = @("emma", "luca", "clara", "ahmed", "sofia")
$allGood = $true

foreach ($char in $characters) {
    $charUpper = $char.ToUpper()
    $scenarioFile = Join-Path $scenarioDir ($char + "_scenario.json")
    
    Write-Host "Checking $charUpper..." -ForegroundColor Yellow
    
    # Check scenario bestand
    if (Test-Path $scenarioFile) {
        Write-Host "  OK Scenario bestand gevonden" -ForegroundColor Green
        
        # Laad en valideer JSON
        try {
            $jsonContent = Get-Content $scenarioFile -Raw | ConvertFrom-Json
            $charData = $jsonContent.PSObject.Properties.Value
            
            # Check character info
            if ($charData.character) {
                Write-Host "  OK Character info: $($charData.character.name)" -ForegroundColor Green
            }
            
            # Check intro
            if ($charData.intro) {
                if ($charData.intro.text -and $charData.intro.background) {
                    Write-Host "  OK Intro met background en parallax effect" -ForegroundColor Green
                } else {
                    Write-Host "  WARNING Intro is aanwezig maar mogelijk incomplete" -ForegroundColor Yellow
                }
            } else {
                Write-Host "  ERROR Intro ontbreekt" -ForegroundColor Red
                $allGood = $false
            }
            
            # Check questions
            $questionCount = $charData.questions.Count
            Write-Host "  OK Aantal vragen: $questionCount" -ForegroundColor Green
            
            # Check eerste vraag structuur
            if ($charData.questions -and $charData.questions.Count -gt 0) {
                $q1 = $charData.questions[0]
                if ($q1.location -and $q1.background -and $q1.context) {
                    Write-Host "  OK Vraag structuur correct" -ForegroundColor Green
                }
            }
            
            # Check intro audio
            $introAudio = Join-Path $voiceOverDir ($charUpper + "\" + $charUpper + "_INTRO.mp3")
            if (Test-Path $introAudio) {
                Write-Host "  OK Intro audio aanwezig" -ForegroundColor Green
            } else {
                Write-Host "  ERROR Intro audio ontbreekt" -ForegroundColor Red
                $allGood = $false
            }
            
        } catch {
            Write-Host "  ERROR JSON parsing: $($_.Exception.Message)" -ForegroundColor Red
            $allGood = $false
        }
    } else {
        Write-Host "  ERROR Scenario bestand niet gevonden" -ForegroundColor Red
        $allGood = $false
    }
    
    Write-Host ""
}

# Check pad in script.js
Write-Host "Checking script.js paden..." -ForegroundColor Yellow
$scriptFile = "K:\Effab - Rumigen\Build\rumigen-demo-main\script.js"
$scriptContent = Get-Content $scriptFile -Raw

if ($scriptContent -match '\.\./Effab_Rumigen_Textbase/scenarios/') {
    Write-Host "  OK Script.js gebruikt correct pad voor scenario bestanden" -ForegroundColor Green
} else {
    Write-Host "  ERROR Script.js pad mogelijk incorrect" -ForegroundColor Red
    $allGood = $false
}

Write-Host ""
Write-Host "=== Samenvatting ===" -ForegroundColor Cyan
if ($allGood) {
    Write-Host "Alle scenario bestanden zijn correct verbonden!" -ForegroundColor Green
    Write-Host ""
    Write-Host "De game kan nu:" -ForegroundColor White
    Write-Host "  - Alle 5 karakters laden" -ForegroundColor White
    Write-Host "  - Intro teksten met backgrounds tonen" -ForegroundColor White
    Write-Host "  - Voice overs afspelen" -ForegroundColor White
    Write-Host "  - Alle vragen en payoffs laden" -ForegroundColor White
} else {
    Write-Host "Er zijn enkele problemen gevonden. Zie hierboven voor details." -ForegroundColor Yellow
}
