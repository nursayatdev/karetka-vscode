# Каретка — запуск: поднимает локальный сервер (если он ещё не работает) и открывает окно приложения.
param([switch]$Demo)                       # -Demo: open the TikTok demo page (/demo) instead of the app
$ErrorActionPreference = 'SilentlyContinue'
$dir = Split-Path -Parent $MyInvocation.MyCommand.Path
$port = 47831
$url  = "http://127.0.0.1:$port/"

function Test-Karetka {
  try { $r = Invoke-RestMethod -Uri "${url}api/whoami" -TimeoutSec 2; return ($r.app -eq 'karetka') } catch { return $false }
}

if (-not (Test-Karetka)) {
  $node = (Get-Command node -ErrorAction SilentlyContinue).Source
  if (-not $node) { $node = @('D:\node.exe', "$env:ProgramFiles\nodejs\node.exe") | Where-Object { Test-Path $_ } | Select-Object -First 1 }
  if ($node) {
    Start-Process -FilePath $node -ArgumentList "`"$dir\server.js`"", '--port', $port -WindowStyle Hidden
    for ($i = 0; $i -lt 50 -and -not (Test-Karetka); $i++) { Start-Sleep -Milliseconds 150 }
  }
}

# server is up -> app with RUN/printer; otherwise the plain offline page (no RUN)
$appUrl = $url; if ($Demo) { $appUrl = "${url}demo" }
$target = if (Test-Karetka) { $appUrl } else { ([System.Uri](Join-Path $dir 'index.html')).AbsoluteUri }
$edge = @("${env:ProgramFiles(x86)}\Microsoft\Edge\Application\msedge.exe", "$env:ProgramFiles\Microsoft\Edge\Application\msedge.exe") | Where-Object { Test-Path $_ } | Select-Object -First 1
if (-not $edge) { Start-Process $target; exit }
$profile = Join-Path $env:LOCALAPPDATA 'Karetka'
Start-Process -FilePath $edge -ArgumentList "--app=$target", "--user-data-dir=`"$profile`"", '--window-size=1440,900', '--autoplay-policy=no-user-gesture-required', '--no-first-run'
