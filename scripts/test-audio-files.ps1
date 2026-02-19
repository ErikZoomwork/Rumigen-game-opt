# Script to validate that all required voice over files exist
# Based on the scenario JSON files

$baseDir = "K:\Effab - Rumigen\Build\rumigen-demo-main"
$voiceOverDir = Join-Path $baseDir "Voice Overs"
$scenarioDir = "K:\Effab - Rumigen\Build\Effab_Rumigen_Textbase\scenarios"

$characters = @("emma", "luca", "clara", "ahmed", "sofia")

Write-Host ""
Write-Host "=== Voice Over Files Validation ===" -ForegroundColor Cyan
Write-Host ""

$totalMissing = 0
$totalFound = 0

foreach ($char in $characters) {
    $charUpper = $char.ToUpper()
    $charDir = Join-Path $voiceOverDir $charUpper
    
    Write-Host "Checking character: $charUpper" -ForegroundColor Yellow
    
    if (-not (Test-Path $charDir)) {
        Write-Host "  ERROR: Character directory not found: $charDir" -ForegroundColor Red
        continue
    }
    
    # Check intro file
    $introFile = Join-Path $charDir ($charUpper + "_INTRO.mp3")
    if (Test-Path $introFile) {
        Write-Host "  OK INTRO found" -ForegroundColor Green
        $totalFound++
    } else {
        Write-Host "  MISSING INTRO: $introFile" -ForegroundColor Red
        $totalMissing++
    }
    
    # Load scenario JSON
    $scenarioFile = Join-Path $scenarioDir ($char + "_scenario.json")
    if (-not (Test-Path $scenarioFile)) {
        Write-Host "  ERROR: Scenario file not found: $scenarioFile" -ForegroundColor Red
        continue
    }
    
    $scenario = Get-Content $scenarioFile -Raw | ConvertFrom-Json
    $charData = $scenario.PSObject.Properties.Value
    $questions = $charData.questions
    
    foreach ($q in $questions) {
        $qNum = "{0:D2}" -f $q.number
        
        # Clean location name
        $location = $q.location -replace '\s+', '_' -replace '[^a-zA-Z0-9_]', ''
        
        # Check question context audio
        $questionFile = Join-Path $charDir ($charUpper + "_Q" + $qNum + "_" + $location + ".mp3")
        if (Test-Path $questionFile) {
            Write-Host "  OK Q$qNum context" -ForegroundColor Green
            $totalFound++
        } else {
            Write-Host "  MISSING Q$qNum context: $questionFile" -ForegroundColor Red
            $totalMissing++
        }
        
        # Check payoff audios for options A, B, C
        foreach ($option in @('A', 'B', 'C')) {
            $payoffFile = Join-Path $charDir ($charUpper + "_Q" + $qNum + "_Payoff_" + $option + ".mp3")
            if (Test-Path $payoffFile) {
                $totalFound++
            } else {
                Write-Host "  MISSING Q$qNum Payoff $option" -ForegroundColor Red
                $totalMissing++
            }
        }
    }
    
    Write-Host ""
}

Write-Host "=== Summary ===" -ForegroundColor Cyan
Write-Host "Files found: $totalFound" -ForegroundColor Green
if ($totalMissing -eq 0) {
    Write-Host "Files missing: $totalMissing" -ForegroundColor Green
    Write-Host ""
    Write-Host "All voice over files are present!" -ForegroundColor Green
} else {
    Write-Host "Files missing: $totalMissing" -ForegroundColor Red
    Write-Host ""
    Write-Host "Some voice over files are missing. Please check the output above." -ForegroundColor Yellow
}
