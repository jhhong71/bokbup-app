# 곰돌이 마스코트 앱 아이콘 생성 (System.Drawing, 의존성 없음)
Add-Type -AssemblyName System.Drawing

$outDir = Join-Path $PSScriptRoot "..\public\icons"
New-Item -ItemType Directory -Force $outDir | Out-Null

function FillCircle($g, [double]$o, [double]$s, [double]$cx, [double]$cy, [double]$r, $brush) {
  $g.FillEllipse($brush, [float]($o + ($cx - $r) * $s), [float]($o + ($cy - $r) * $s), [float](2 * $r * $s), [float](2 * $r * $s))
}
function FillOval($g, [double]$o, [double]$s, [double]$cx, [double]$cy, [double]$rx, [double]$ry, $brush) {
  $g.FillEllipse($brush, [float]($o + ($cx - $rx) * $s), [float]($o + ($cy - $ry) * $s), [float](2 * $rx * $s), [float](2 * $ry * $s))
}

function Draw-Icon([int]$size) {
  $bmp = New-Object System.Drawing.Bitmap $size, $size
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias

  $cream  = [System.Drawing.Color]::FromArgb(255, 251, 243, 229) # #FBF3E5
  $fur    = [System.Drawing.Color]::FromArgb(255, 242, 200, 148) # #F2C894
  $inner  = [System.Drawing.Color]::FromArgb(255, 251, 227, 196) # #FBE3C4
  $dark   = [System.Drawing.Color]::FromArgb(255,  92,  69,  49) # #5C4531
  $blush  = [System.Drawing.Color]::FromArgb(140, 242, 167, 140) # #F2A78C(반투명)

  $bCream = New-Object System.Drawing.SolidBrush $cream
  $bFur   = New-Object System.Drawing.SolidBrush $fur
  $bInner = New-Object System.Drawing.SolidBrush $inner
  $bDark  = New-Object System.Drawing.SolidBrush $dark
  $bBlush = New-Object System.Drawing.SolidBrush $blush

  # 배경 (마스커블 아이콘용 풀블리드)
  $g.FillRectangle($bCream, 0, 0, $size, $size)

  # SVG(64 viewBox) 좌표 → 아이콘 좌표 변환 (중앙 80% 세이프존)
  $s = $size / 64.0 * 0.8
  $o = $size * 0.1

  FillCircle $g $o $s 18 16 9   $bFur   # 귀
  FillCircle $g $o $s 46 16 9   $bFur
  FillCircle $g $o $s 18 17 4.5 $bInner
  FillCircle $g $o $s 46 17 4.5 $bInner
  FillCircle $g $o $s 32 36 22  $bFur   # 얼굴
  FillOval   $g $o $s 32 43 10 8 $bInner # 주둥이
  FillCircle $g $o $s 24 32 2.4 $bDark  # 눈
  FillCircle $g $o $s 40 32 2.4 $bDark
  FillOval   $g $o $s 32 40 3 2.4 $bDark # 코
  FillCircle $g $o $s 19 40 3.2 $bBlush # 볼터치
  FillCircle $g $o $s 45 40 3.2 $bBlush

  # 입 (세로선 + 미소 아크 2개)
  $pen = New-Object System.Drawing.Pen $dark, ([float]([Math]::Max(1.5, 1.6 * $s)))
  $pen.StartCap = 'Round'; $pen.EndCap = 'Round'
  $g.DrawLine($pen, [float]($o + 32 * $s), [float]($o + 42.5 * $s), [float]($o + 32 * $s), [float]($o + 45 * $s))
  $g.DrawArc($pen, [float]($o + 27 * $s), [float]($o + 42.5 * $s), [float](5 * $s), [float](4 * $s), 20, 140)
  $g.DrawArc($pen, [float]($o + 32 * $s), [float]($o + 42.5 * $s), [float](5 * $s), [float](4 * $s), 20, 140)

  $g.Dispose()
  return $bmp
}

foreach ($size in 512, 192, 180) {
  $bmp = Draw-Icon $size
  $path = Join-Path $outDir "icon-$size.png"
  $bmp.Save($path, [System.Drawing.Imaging.ImageFormat]::Png)
  $bmp.Dispose()
  Write-Output "OK: $path"
}
