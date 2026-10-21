Add-Type -AssemblyName System.Drawing

$srcPath = "X:\Career_Engine\AstreWork.png"
if (Test-Path $srcPath) {
    $img = [System.Drawing.Bitmap]::FromFile($srcPath)
    $w = $img.Width
    $h = $img.Height

    $minX = $w
    $minY = $h
    $maxX = 0
    $maxY = 0

    for ($y = 0; $y -lt $h; $y += 2) {
        for ($x = 0; $x -lt $w; $x += 2) {
            $c = $img.GetPixel($x, $y)
            if ($c.R -lt 240 -or $c.G -lt 240 -or $c.B -lt 240) {
                if ($x -lt $minX) { $minX = $x }
                if ($x -gt $maxX) { $maxX = $x }
                if ($y -lt $minY) { $minY = $y }
                if ($y -gt $maxY) { $maxY = $y }
            }
        }
    }

    $pad = 12
    $cropX = [Math]::Max(0, $minX - $pad)
    $cropY = [Math]::Max(0, $minY - $pad)
    $cropW = [Math]::Min($w - $cropX, ($maxX - $minX) + ($pad * 2))
    $cropH = [Math]::Min($h - $cropY, ($maxY - $minY) + ($pad * 2))

    $rect = [System.Drawing.Rectangle]::new($cropX, $cropY, $cropW, $cropH)
    $cropped = $img.Clone($rect, $img.PixelFormat)
    $img.Dispose()

    $destPath1 = "X:\Career_Engine\public\astrework-logo.png"
    $destPath2 = "X:\Career_Engine\public\astrework-logo-cropped.png"

    $cropped.Save($destPath1, [System.Drawing.Imaging.ImageFormat]::Png)
    $cropped.Save($destPath2, [System.Drawing.Imaging.ImageFormat]::Png)
    $cropped.Dispose()
}

Write-Host "CROPPED SUCCESS: Width=$cropW, Height=$cropH"
