# Install-Screensaver.ps1
# Installs the Screensavers app to AppData (no admin required) and sets it as the active screensaver.

$source = Join-Path $PSScriptRoot "dist\win-unpacked"
$dest   = Join-Path $env:LOCALAPPDATA "Screensavers"
$scr    = Join-Path $dest "Screensavers.scr"

if (-not (Test-Path $source)) {
    Write-Error "Build output not found at $source. Run 'npm run build' first."
    exit 1
}

Write-Host "Stopping any running screensaver processes ..."
@("Screensavers.scr","Screensavers.exe") | ForEach-Object {
    taskkill /F /IM $_ /T 2>$null | Out-Null
}
Start-Sleep -Milliseconds 800

Write-Host "Copying files to $dest ..."
robocopy $source $dest /E /IS /IT /NFL /NDL /NJH /NJS | Out-Null

# Ensure the binary is named .scr so Windows recognises it as a screensaver
$exe = Join-Path $dest "Screensavers.exe"
if (Test-Path $exe) {
    if (Test-Path $scr) { Remove-Item $scr -Force }
    Rename-Item $exe "Screensavers.scr"
}

Write-Host "Registering screensaver via registry ..."
$key = "HKCU:\Control Panel\Desktop"
Set-ItemProperty $key -Name "SCRNSAVE.EXE"     -Value $scr
Set-ItemProperty $key -Name "ScreenSaveActive"  -Value "1"
# Honour whatever idle time is already set; only set a default if missing
if (-not (Get-ItemProperty $key -Name "ScreenSaveTimeOut" -ErrorAction SilentlyContinue)) {
    Set-ItemProperty $key -Name "ScreenSaveTimeOut" -Value "300"
}

Write-Host ""
Write-Host "Done! Screensaver installed at:"
Write-Host "  $scr"
Write-Host ""
Write-Host "To verify: right-click desktop -> Personalize -> Lock screen -> Screen saver settings"
Write-Host "You should see 'Screensavers' selected. Adjust the wait time there if you like."
