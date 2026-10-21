Add-Type -AssemblyName System.Drawing

$srcPath = "X:\Career_Engine\Favicon.png"
if (Test-Path $srcPath) {
    $src = [System.Drawing.Bitmap]::FromFile($srcPath)

    $w = $src.Width
    $h = $src.Height

    # Find bounding box of white pixels inside Favicon.png
    $minX = $w; $minY = $h; $maxX = 0; $maxY = 0

    for ($y = 0; $y -lt $h; $y += 2) {
        for ($x = 0; $x -lt $w; $x += 2) {
            $c = $src.GetPixel($x, $y)
            if ($c.R -gt 150 -and $c.G -gt 150 -and $c.B -gt 150) {
                if ($x -lt $minX) { $minX = $x }
                if ($x -gt $maxX) { $maxX = $x }
                if ($y -lt $minY) { $minY = $y }
                if ($y -gt $maxY) { $maxY = $y }
            }
        }
    }

    $cropRect = [System.Drawing.Rectangle]::new($minX, $minY, ($maxX - $minX), ($maxY - $minY))
    $cropped = $src.Clone($cropRect, $src.PixelFormat)

    # 128x128 canvas
    $out128 = New-Object System.Drawing.Bitmap(128, 128, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $g128 = [System.Drawing.Graphics]::FromImage($out128)
    $g128.Clear([System.Drawing.Color]::Transparent)
    $g128.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g128.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $g128.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality

    # Draw cropped emblem filling 124x124 (max scale)
    $g128.DrawImage($cropped, 2, 2, 124, 124)
    $g128.Dispose()

    # Make dark pixels transparent, and bright pixels white with subtle dark boundary
    for ($y = 0; $y -lt 128; $y++) {
        for ($x = 0; $x -lt 128; $x++) {
            $c = $out128.GetPixel($x, $y)
            $brightness = [Math]::Max($c.R, [Math]::Max($c.G, $c.B))
            if ($brightness -lt 110) {
                $out128.SetPixel($x, $y, [System.Drawing.Color]::FromArgb(0, 0, 0, 0))
            } else {
                $alpha = [Math]::Min(255, [int](($brightness / 255.0) * 255.0))
                $out128.SetPixel($x, $y, [System.Drawing.Color]::FromArgb($alpha, 255, 255, 255))
            }
        }
    }

    # Save PNGs with transparent background
    $out128.Save("X:\Career_Engine\src\app\icon.png", [System.Drawing.Imaging.ImageFormat]::Png)
    $out128.Save("X:\Career_Engine\src\app\apple-icon.png", [System.Drawing.Imaging.ImageFormat]::Png)
    $out128.Save("X:\Career_Engine\public\favicon.png", [System.Drawing.Imaging.ImageFormat]::Png)

    # Generate 32x32 ico
    $out32 = New-Object System.Drawing.Bitmap(32, 32, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $g32 = [System.Drawing.Graphics]::FromImage($out32)
    $g32.Clear([System.Drawing.Color]::Transparent)
    $g32.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g32.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $g32.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g32.DrawImage($out128, 0, 0, 32, 32)
    $g32.Dispose()

    $icon = [System.Drawing.Icon]::FromHandle($out32.GetHicon())
    $fs1 = [System.IO.File]::Open("X:\Career_Engine\src\app\favicon.ico", [System.IO.FileMode]::Create)
    $icon.Save($fs1)
    $fs1.Close()

    $fs2 = [System.IO.File]::Open("X:\Career_Engine\public\favicon.ico", [System.IO.FileMode]::Create)
    $icon.Save($fs2)
    $fs2.Close()

    $src.Dispose()
    $cropped.Dispose()
    $out128.Dispose()
    $out32.Dispose()

    Write-Host "FAVICON OPTIMIZED AND SAVED"
}
