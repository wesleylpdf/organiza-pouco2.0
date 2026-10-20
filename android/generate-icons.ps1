Add-Type -AssemblyName System.Drawing

$source = "D:\openclaude\organiza-pouco\android\Orgaiza pouco.jpeg"
$outputDir = "D:\openclaude\organiza-pouco\android\app\src\main\res"

$img = [System.Drawing.Image]::FromFile($source)
Write-Host "Imagem original: $($img.Width)x$($img.Height)"

# Tamanhos dos ícones Android
$sizes = @{
    "mipmap-mdpi" = 48
    "mipmap-hdpi" = 72
    "mipmap-xhdpi" = 96
    "mipmap-xxhdpi" = 144
    "mipmap-xxxhdpi" = 192
}

foreach ($folder in $sizes.Keys) {
    $size = $sizes[$folder]
    $outputPath = Join-Path $outputDir "$folder"

    # Criar pasta se não existir
    if (!(Test-Path $outputPath)) {
        New-Item -ItemType Directory -Path $outputPath | Out-Null
    }

    # Criar bitmap redimensionado
    $bmp = New-Object System.Drawing.Bitmap($size, $size)
    $graphics = [System.Drawing.Graphics]::FromImage($bmp)
    $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $graphics.DrawImage($img, 0, 0, $size, $size)

    # Salvar como PNG
    $bmp.Save("$outputPath\ic_launcher.png", [System.Drawing.Imaging.ImageFormat]::Png)
    $bmp.Save("$outputPath\ic_launcher_round.png", [System.Drawing.Imaging.ImageFormat]::Png)

    $graphics.Dispose()
    $bmp.Dispose()

    Write-Host "Criado: $folder ($size x $size)"
}

$img.Dispose()
Write-Host "`nÍcones criados com sucesso!"
