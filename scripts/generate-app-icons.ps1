Add-Type -AssemblyName System.Drawing

$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $PSScriptRoot
$images = Join-Path $root 'assets/images'

function ColorFromHex([string] $hex, [int] $alpha = 255) {
  $clean = $hex.TrimStart('#')
  $r = [Convert]::ToInt32($clean.Substring(0, 2), 16)
  $g = [Convert]::ToInt32($clean.Substring(2, 2), 16)
  $b = [Convert]::ToInt32($clean.Substring(4, 2), 16)
  return [System.Drawing.Color]::FromArgb($alpha, $r, $g, $b)
}

function New-RoundedRectPath([float] $x, [float] $y, [float] $w, [float] $h, [float] $r) {
  $path = New-Object System.Drawing.Drawing2D.GraphicsPath
  $d = $r * 2
  $path.AddArc($x, $y, $d, $d, 180, 90)
  $path.AddArc($x + $w - $d, $y, $d, $d, 270, 90)
  $path.AddArc($x + $w - $d, $y + $h - $d, $d, $d, 0, 90)
  $path.AddArc($x, $y + $h - $d, $d, $d, 90, 90)
  $path.CloseFigure()
  return $path
}

function New-Canvas([int] $size) {
  $bitmap = New-Object System.Drawing.Bitmap $size, $size, ([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
  $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
  $graphics.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
  $graphics.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit
  return @{ Bitmap = $bitmap; Graphics = $graphics }
}

function Save-Png($canvas, [string] $path) {
  $canvas.Bitmap.Save($path, [System.Drawing.Imaging.ImageFormat]::Png)
  $canvas.Graphics.Dispose()
  $canvas.Bitmap.Dispose()
}

function Draw-Background($graphics) {
  $rect = New-Object System.Drawing.RectangleF 0, 0, 1024, 1024
  $brush = New-Object System.Drawing.Drawing2D.LinearGradientBrush $rect, (ColorFromHex '#0F75F5'), (ColorFromHex '#18B981'), 45
  $graphics.FillRectangle($brush, $rect)
  $brush.Dispose()

  $gridPen = New-Object System.Drawing.Pen (ColorFromHex '#FFFFFF' 28), 2
  for ($i = 128; $i -le 896; $i += 128) {
    $graphics.DrawLine($gridPen, $i, 96, $i, 928)
    $graphics.DrawLine($gridPen, 96, $i, 928, $i)
  }
  $gridPen.Dispose()

  $glowBrush = New-Object System.Drawing.SolidBrush (ColorFromHex '#FFFFFF' 22)
  $graphics.FillEllipse($glowBrush, 238, 112, 548, 548)
  $glowBrush.Dispose()
}

function Draw-ReceiptAndPin($graphics, [string] $mode) {
  $isMono = $mode -eq 'mono'
  $isSplash = $mode -eq 'splash'
  $receiptFill = if ($isMono -or $isSplash) { ColorFromHex '#FFFFFF' } else { ColorFromHex '#F8FCFF' }
  $primary = if ($isMono -or $isSplash) { ColorFromHex '#FFFFFF' } else { ColorFromHex '#0F75F5' }
  $muted = if ($isMono -or $isSplash) { ColorFromHex '#FFFFFF' 210 } else { ColorFromHex '#AAB7C4' }
  $pin = if ($isMono -or $isSplash) { ColorFromHex '#FFFFFF' } else { ColorFromHex '#18B981' }

  if (-not $isMono -and -not $isSplash) {
    $shadowPath = New-RoundedRectPath 286 188 420 590 52
    $shadowBrush = New-Object System.Drawing.SolidBrush (ColorFromHex '#07304F' 58)
    $graphics.TranslateTransform(0, 20)
    $graphics.FillPath($shadowBrush, $shadowPath)
    $graphics.ResetTransform()
    $shadowBrush.Dispose()
    $shadowPath.Dispose()
  }

  $receiptPath = New-RoundedRectPath 286 168 420 590 52
  $receiptBrush = New-Object System.Drawing.SolidBrush $receiptFill
  $graphics.FillPath($receiptBrush, $receiptPath)
  $receiptBrush.Dispose()

  $accentBrush = New-Object System.Drawing.SolidBrush $primary
  $graphics.FillRectangle($accentBrush, 356, 262, 164, 18)
  $graphics.FillRectangle($accentBrush, 356, 302, 164, 18)
  $font = New-Object System.Drawing.Font 'Segoe UI', 176, ([System.Drawing.FontStyle]::Bold), ([System.Drawing.GraphicsUnit]::Pixel)
  $graphics.DrawString('P', $font, $accentBrush, 354, 210)
  $font.Dispose()

  $linePen = New-Object System.Drawing.Pen $muted, 22
  $linePen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
  $linePen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
  $graphics.DrawLine($linePen, 358, 438, 622, 438)
  $graphics.DrawLine($linePen, 358, 508, 578, 508)
  $graphics.DrawLine($linePen, 358, 578, 620, 578)
  $linePen.Dispose()

  $checkPen = New-Object System.Drawing.Pen $primary, 26
  $checkPen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
  $checkPen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
  $graphics.DrawLines($checkPen, @(
    [System.Drawing.PointF]::new(388, 666),
    [System.Drawing.PointF]::new(438, 716),
    [System.Drawing.PointF]::new(562, 630)
  ))
  $checkPen.Dispose()
  $accentBrush.Dispose()

  $pinBrush = New-Object System.Drawing.SolidBrush $pin
  $graphics.FillEllipse($pinBrush, 584, 560, 172, 172)
  $graphics.FillPolygon($pinBrush, @(
    [System.Drawing.PointF]::new(612, 694),
    [System.Drawing.PointF]::new(728, 694),
    [System.Drawing.PointF]::new(670, 820)
  ))

  if (-not $isMono -and -not $isSplash) {
    $dotBrush = New-Object System.Drawing.SolidBrush (ColorFromHex '#FFFFFF')
    $graphics.FillEllipse($dotBrush, 642, 616, 56, 56)
    $dotBrush.Dispose()
  }

  $pinBrush.Dispose()
  $receiptPath.Dispose()
}

function Render-Icon([int] $size, [string] $path, [switch] $transparent, [switch] $backgroundOnly, [string] $mode = 'color') {
  $canvas = New-Canvas $size
  $g = $canvas.Graphics
  $g.Clear([System.Drawing.Color]::Transparent)

  $state = $g.Save()
  $scale = $size / 1024
  $g.ScaleTransform($scale, $scale)

  if (-not $transparent) {
    Draw-Background $g
  }
  if (-not $backgroundOnly) {
    Draw-ReceiptAndPin $g $mode
  }

  $g.Restore($state)
  Save-Png $canvas $path
}

New-Item -ItemType Directory -Force -Path $images | Out-Null

Render-Icon 1024 (Join-Path $images 'icon.png')
Render-Icon 1024 (Join-Path $images 'android-icon-background.png') -backgroundOnly
Render-Icon 1024 (Join-Path $images 'android-icon-foreground.png') -transparent
Render-Icon 1024 (Join-Path $images 'android-icon-monochrome.png') -transparent -mode 'mono'
Render-Icon 512 (Join-Path $images 'splash-icon.png') -transparent -mode 'splash'
Render-Icon 256 (Join-Path $images 'favicon.png')

Write-Host 'Generated Payment Tracker app icons.'
