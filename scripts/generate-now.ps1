# Generates one post right now from this computer. Asks for the Claude API key (hidden, not saved).
Set-Location (Join-Path $PSScriptRoot "..")
if (-not $env:ANTHROPIC_API_KEY) {
  $secure = Read-Host "Paste your Claude API key, then press Enter" -AsSecureString
  $env:ANTHROPIC_API_KEY = [Net.NetworkCredential]::new("", $secure).Password.Trim()
}
$key = $env:ANTHROPIC_API_KEY
if (-not $key.StartsWith("sk-ant-") -or $key.Length -lt 60) {
  Write-Host ""
  Write-Host "That does not look like a complete key. Keys start with sk-ant- and are about 100 characters." -ForegroundColor Red
  Write-Host "You pasted $($key.Length) characters starting with '$($key.Substring(0, [Math]::Min(10, $key.Length)))'." -ForegroundColor Red
  Write-Host "Create one at console.anthropic.com > Settings > API keys > Create Key." -ForegroundColor Yellow
  exit 1
}
Write-Host "Key looks right ($($key.Length) characters). Starting..." -ForegroundColor Green
$env:FORCE = "1"
& "C:\Program Files\nodejs\node.exe" scripts/generate-post.mjs
