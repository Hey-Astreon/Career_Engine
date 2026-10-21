Add-Type -AssemblyName System.Drawing

$srcPath = "X:\Career_Engine\Favicon.png"
if (Test-Path $srcPath) {
    $img = [System.Drawing.Bitmap]::FromFile($srcPath)

    # 1. Save as high-res 128x128 icon.png in src/app
    $bmp128 = New-Object System.Drawing.Bitmap(128, 128)
    $g128 = [System.Drawing.Graphics]::FromImage($bmp128)
    $g128.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g128.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $g128.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g128.DrawImage($img, 0, 0, 128, 128)
    $g128.Dispose()

    $bmp128.Save("X:\Career_Engine\src\app\icon.png", [System.Drawing.Imaging.ImageFormat]::Png)
    $bmp128.Save("X:\Career_Engine\src\app\apple-icon.png", [System.Drawing.Imaging.ImageFormat]::Png)
    $bmp128.Save("X:\Career_Engine\public\favicon.png", [System.Drawing.Imaging.ImageFormat]::Png)

    # 2. Save 32x32 ico
    $bmp32 = New-Object System.Drawing.Bitmap(32, 32)
    $g32 = [System.Drawing.Graphics]::FromImage($bmp32)
    $g32.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g32.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $g32.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g32.DrawImage($img, 0, 0, 32, 32)
    $g32.Dispose()

    $icon = [System.Drawing.Icon]::FromHandle($bmp32.GetHicon())
    $fileStream1 = [System.IO.File]::Open("X:\Career_Engine\src\app\favicon.ico", [System.IO.FileMode]::Create)
    $icon.Save($fileStream1)
    $fileStream1.Close()

    $fileStream2 = [System.IO.File]::Open("X:\Career_Engine\public\favicon.ico", [System.IO.FileMode]::Create)
    $icon.Save($fileStream2)
    $fileStream2.Close()

    $img.Dispose()
    $bmp128.Dispose()
    $bmp32.Dispose()

    Write-Host "FAVICON REPLACED SUCCESSFULLY EVERYWHERE"
}
