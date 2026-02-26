param(
    [string]$ChromePath = "C:\Program Files\Google\Chrome\Application\chrome.exe"
)

$baseDir = "K:\Effab Rumigen - Game"
$charDir = "$baseDir\SVG\characters"
$outDir  = "$baseDir\assets\images"
$tempDir = "$env:TEMP\char-render"
New-Item -ItemType Directory -Force -Path $tempDir | Out-Null

$characters = @("Ahmed", "Clara", "Emma", "Luca", "Sofia")

# Default layers (bottom to top) — neutral expression
$layerTemplates = @(
    "layer1-{0}-Shirt.svg",
    "layer10-{0}-Hoofd.svg",
    "layer9-{0}-Ogen-Normaal.svg",
    "layer3-{0}-Mond-Neutraal.svg"
)

foreach ($char in $characters) {
    Write-Host "Rendering $char..." -ForegroundColor Cyan

    # Build absolute file:/// URIs for each layer
    $layerImgs = $layerTemplates | ForEach-Object {
        $file = $_ -f $char
        $path = "$charDir\$char\$file" -replace '\\', '/'
        "file:///$path"
    }

    # Generate HTML: 1920x1080, layers stacked with position:absolute
    $imgs = ($layerImgs | ForEach-Object {
        "    <img src='$_' style='position:absolute;top:0;left:0;width:100%;height:100%;'>"
    }) -join "`n"

    $html = @"
<!DOCTYPE html>
<html>
<head>
<meta charset='UTF-8'>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { width: 1920px; height: 1080px; overflow: hidden; background: #f0ede6; }
  .stage { position: relative; width: 1080px; height: 1080px; left: 420px; }
</style>
</head>
<body>
  <div class="stage">
$imgs
  </div>
</body>
</html>
"@

    $htmlPath = "$tempDir\$char.html"
    $pngPath  = "$tempDir\$char.png"
    $jpgPath  = "$outDir\Character - $char.jpg"

    $html | Out-File -FilePath $htmlPath -Encoding utf8 -Force

    # Run Chrome headless screenshot
    $args = @(
        "--headless=new",
        "--disable-gpu",
        "--no-sandbox",
        "--screenshot=$pngPath",
        "--window-size=1920,1080",
        "--hide-scrollbars",
        "file:///$($htmlPath -replace '\\','/')"
    )
    & $ChromePath @args 2>$null
    Start-Sleep -Seconds 3

    if (Test-Path $pngPath) {
        # Convert PNG to JPG using System.Drawing
        Add-Type -AssemblyName System.Drawing
        $bmp = [System.Drawing.Image]::FromFile($pngPath)
        $jpgEncoder = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() |
            Where-Object { $_.MimeType -eq "image/jpeg" }
        $encParams = New-Object System.Drawing.Imaging.EncoderParameters(1)
        $encParams.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter(
            [System.Drawing.Imaging.Encoder]::Quality, 90L)
        $w = $bmp.Width; $h = $bmp.Height
        $bmp.Save($jpgPath, $jpgEncoder, $encParams)
        $bmp.Dispose()
        Write-Host "  Saved: $jpgPath (${w}x${h})" -ForegroundColor Green
        Remove-Item $pngPath -Force
    } else {
        Write-Host "  ERROR: screenshot not created for $char" -ForegroundColor Red
    }
}

Remove-Item $tempDir -Recurse -Force -ErrorAction SilentlyContinue
Write-Host "`nDone!" -ForegroundColor Green
