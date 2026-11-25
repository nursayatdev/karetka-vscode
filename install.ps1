# Каретка — установка ярлыка на рабочий стол (запуск: правый клик → Выполнить с PowerShell)
Add-Type -AssemblyName System.Drawing
$dir  = Split-Path -Parent $MyInvocation.MyCommand.Path
$html = Join-Path $dir 'index.html'
$ico  = Join-Path $dir 'karetka.ico'

# --- icon: use the ready karetka.ico (made from assets/icon.png); draw a fallback only if missing ---
if (-not (Test-Path $ico)) {
$bmp = New-Object System.Drawing.Bitmap 256,256
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.SmoothingMode = 'AntiAlias'
$g.Clear([System.Drawing.Color]::Transparent)
function RoundRect($x,$y,$w,$h,$r){ $p = New-Object System.Drawing.Drawing2D.GraphicsPath; $p.AddArc($x,$y,$r,$r,180,90); $p.AddArc($x+$w-$r,$y,$r,$r,270,90); $p.AddArc($x+$w-$r,$y+$h-$r,$r,$r,0,90); $p.AddArc($x,$y+$h-$r,$r,$r,90,90); $p.CloseFigure(); $p }
$g.FillPath((New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(255,14,15,18))), (RoundRect 8 8 240 240 70))
$sheet = New-Object System.Drawing.Drawing2D.GraphicsPath
$sheet.AddArc(46,40,164,90,180,180); $sheet.AddLine(210,85,210,170); $sheet.AddLine(210,170,46,170); $sheet.CloseFigure()
$g.FillPath((New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(255,92,98,105))), $sheet)
$cone = New-Object System.Drawing.Drawing2D.GraphicsPath
$cone.AddPolygon([System.Drawing.Point[]]@((New-Object System.Drawing.Point 120,160),(New-Object System.Drawing.Point 136,160),(New-Object System.Drawing.Point 200,60),(New-Object System.Drawing.Point 56,60)))
$pg = New-Object System.Drawing.Drawing2D.PathGradientBrush $cone
$pg.CenterPoint = New-Object System.Drawing.PointF 128,158
$pg.CenterColor = [System.Drawing.Color]::FromArgb(255,250,247,238)
$pg.SurroundColors = @([System.Drawing.Color]::FromArgb(0,250,247,238))
$g.SetClip($sheet); $g.FillPath($pg,$cone); $g.ResetClip()
$g.FillRectangle((New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(255,28,32,38))), 20,168,216,14)
$g.FillPath((New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(255,160,166,173))), (RoundRect 84 158 88 46 46))
$amber = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(255,255,179,71))
$g.FillEllipse($amber,106,175,12,12); $g.FillEllipse($amber,124,175,12,12)
$g.FillEllipse((New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(255,40,42,46))),142,175,12,12)
$g.Dispose()
$ms = New-Object System.IO.MemoryStream; $bmp.Save($ms,[System.Drawing.Imaging.ImageFormat]::Png); $png = $ms.ToArray()
$fs = [System.IO.File]::Create($ico); $bw = New-Object System.IO.BinaryWriter $fs
$bw.Write([UInt16]0); $bw.Write([UInt16]1); $bw.Write([UInt16]1)
$bw.Write([Byte]0); $bw.Write([Byte]0); $bw.Write([Byte]0); $bw.Write([Byte]0)
$bw.Write([UInt16]1); $bw.Write([UInt16]32); $bw.Write([UInt32]$png.Length); $bw.Write([UInt32]22)
$bw.Write($png); $bw.Close()
}

# --- shortcut: Karetka.vbs silently starts the local runner (RUN + printer) and opens the Edge app window ---
$vbs = Join-Path $dir 'Karetka.vbs'
$sh = New-Object -ComObject WScript.Shell
foreach ($target in @([Environment]::GetFolderPath('Desktop'), [Environment]::GetFolderPath('Programs'))) {
  $lnk = $sh.CreateShortcut((Join-Path $target 'Каретка.lnk'))
  $lnk.TargetPath = "$env:WINDIR\System32\wscript.exe"; $lnk.Arguments = "//nologo `"$vbs`""; $lnk.IconLocation = $ico
  $lnk.Description = 'Каретка — печатная машинка'; $lnk.WorkingDirectory = $dir
  $lnk.Save()
}
$vbsDemo = Join-Path $dir 'KaretkaDemo.vbs'
$lnk = $sh.CreateShortcut((Join-Path ([Environment]::GetFolderPath('Desktop')) 'Каретка — демо TikTok.lnk'))
$lnk.TargetPath = "$env:WINDIR\System32\wscript.exe"; $lnk.Arguments = "//nologo `"$vbsDemo`""; $lnk.IconLocation = $ico
$lnk.Description = 'Каретка — авто-демо для TikTok'; $lnk.WorkingDirectory = $dir
$lnk.Save()
Write-Host 'Готово: ярлыки «Каретка» и «Каретка — демо TikTok» на рабочем столе, «Каретка» в меню Пуск.'
