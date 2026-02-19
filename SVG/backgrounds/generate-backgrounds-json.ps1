# Generate backgrounds.json automatically by scanning folders
# Run this script whenever you add a new background folder

$backgroundsPath = $PSScriptRoot
$outputFile = Join-Path $backgroundsPath "backgrounds.json"

Write-Host "Scanning for background folders..."

# Get all subdirectories (each is a background)
$folders = Get-ChildItem -Path $backgroundsPath -Directory | Where-Object { $_.Name -ne "_Unused" }

$backgrounds = @()

foreach ($folder in $folders) {
    $folderName = $folder.Name
    Write-Host "  Found: $folderName"
    
    # Get all SVG files in this folder
    $svgFiles = Get-ChildItem -Path $folder.FullName -Filter "*.svg" | Sort-Object Name
    
    if ($svgFiles.Count -eq 0) {
        Write-Host "    No SVG files found, skipping..."
        continue
    }
    
    $layers = @()
    
    foreach ($svg in $svgFiles) {
        $fileName = $svg.Name
        # Parse filename: backgroundname-layer-XX-description.svg
        $prefix = $folderName + "-layer-"
        
        if ($fileName.StartsWith($prefix) -and $fileName.EndsWith(".svg")) {
            # Extract the middle part
            $prefixLen = $prefix.Length
            $middle = $fileName.Substring($prefixLen, $fileName.Length - $prefixLen - 4)
            
            # Split on first dash to get number and name
            $parts = $middle -split '-', 2
            
            if ($parts.Count -eq 2) {
                $layerNumber = [int]$parts[0]
                $layerName = $parts[1]
                
                # Assign layerClass based on position
                $layerClass = "layer-3"
                switch ($layerNumber) {
                    1 { $layerClass = "layer-6" }
                    2 { $layerClass = "layer-5" }
                    3 { $layerClass = "layer-4" }
                    4 { $layerClass = "layer-3" }
                    5 { $layerClass = "layer-7" }
                    6 { $layerClass = "layer-2" }
                    7 { $layerClass = "layer-1" }
                }
                
                $layer = @{
                    number = $layerNumber
                    name = $layerName
                    layerClass = $layerClass
                }
                $layers += $layer
                
                Write-Host "    Layer $layerNumber : $layerName ($layerClass)"
            }
        } else {
            Write-Host "    Skipping invalid filename: $fileName"
        }
    }
    
    if ($layers.Count -gt 0) {
        # Create display name (capitalize first letter of each word)
        $words = $folderName -split '-'
        $displayWords = @()
        foreach ($word in $words) {
            $displayWord = $word.Substring(0,1).ToUpper() + $word.Substring(1).ToLower()
            $displayWords += $displayWord
        }
        $displayName = $displayWords -join ' '
        
        $bg = @{
            name = $folderName
            displayName = $displayName
            layers = $layers
        }
        $backgrounds += $bg
    }
}

# Create JSON structure
$result = @{
    backgrounds = $backgrounds
}

$json = $result | ConvertTo-Json -Depth 10

# Write to file
Set-Content -Path $outputFile -Value $json -Encoding UTF8

Write-Host ""
Write-Host "Generated backgrounds.json with $($backgrounds.Count) backgrounds!"
Write-Host "File: $outputFile"
Write-Host ""
Write-Host "Backgrounds added:"
foreach ($bg in $backgrounds) {
    Write-Host "  - $($bg.displayName) ($($bg.layers.Count) layers)"
}
