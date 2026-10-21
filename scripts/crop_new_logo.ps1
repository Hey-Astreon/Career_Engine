Add-Type -AssemblyName System.Drawing

$srcPath = "X:\Career_Engine\AstreWork.png"
if (Test-Path $srcPath) {
    $img = [System.Drawing.Bitmap]::FromFile($srcPath)
    $w = $img.Width
    $h = $img.Height

    $minX = $w; $minY = $h; $maxX = 0; $maxY = 0

    # Check all non-white pixels
    for ($y = 0; $y -lt $h; $y++) {
        for ($x = 0; $x -lt $w; $x++) {
            $c = $img.GetPixel($x, $y)
            if ($c.R -lt 240 -or $c.G -lt 240 -or $c.B -lt 240) {
                if ($x -lt $minX) { $minX = $x }
                if ($x -gt $maxX) { $maxX = $x }
                if ($y -lt $minY) { $minY = $y }
                if ($y -gt $maxY) { $maxY = $y }
            }
        }
    }

    Write-Host "New AstreWork bounds: X=$minX..$maxX (W=$($maxX - $minX)), Y=$minY..$maxY (H=$($maxY - $minY)), Total Image: ${w}x${h}"

    $pad = 6
    $cropX = [Math]::Max(0, $minX - $pad)
    $cropY = [Math]::Max(0, $minY - $pad)
    $cropW = [Math]::Min($w - $cropX, ($maxX - $minX) + ($pad * 2))
    $cropH = [Math]::Min($h - $cropY, ($maxY - $minY) + ($pad * 2))

    $rect = [System.Drawing.Rectangle]::new($cropX, $cropY, $cropW, $cropH)
    $cropped = $img.Clone($rect, $img.PixelFormat)
    $img.Dispose()

    $dest1 = "X:\Career_Engine\public\astrework-logo.png"
    $dest2 = "X:\Career_Engine\public\astrework-logo-full.png"

    $cropped.Save($dest1, [System.Drawing.Imaging.ImageFormat]::Png)
    $cropped.Save($dest2, [System.Drawing.Imaging.ImageFormat]::Png)
    $cropped.Dispose()

    Write-Host "SUCCESSFULLY CROPPED & SAVED TO PUBLIC AS: ${cropW}x${cropH}"
}
