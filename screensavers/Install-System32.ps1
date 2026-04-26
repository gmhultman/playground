# Install-System32.ps1
# Compiles a tiny launcher stub and copies it to System32 so "Screensavers"
# appears in the Windows Screen Saver Settings dropdown.
# Must be run as Administrator (right-click → Run as administrator).

$dest        = "C:\Windows\System32\Screensavers.scr"
$localTarget = Join-Path $env:LOCALAPPDATA "Screensavers\Screensavers.scr"

if (-not (Test-Path $localTarget)) {
    Write-Error "Main screensaver not found at $localTarget`nRun Install-Screensaver.ps1 first."
    exit 1
}

# Tiny C# launcher: finds the real .scr in LOCALAPPDATA and relays all args to it.
$csharp = @"
using System;
using System.Diagnostics;
using System.IO;
class Launcher {
    static void Main(string[] args) {
        try {
            string scr = Path.Combine(
                Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
                "Screensavers", "Screensavers.scr");
            if (!File.Exists(scr)) return;
            string argStr = args.Length > 0 ? string.Join(" ", args) : "/s";
            var p = Process.Start(new ProcessStartInfo(scr, argStr) { UseShellExecute = false });
            string al = argStr.TrimStart().ToLower().TrimStart('-', '/');
            if (al.StartsWith("s") && p != null) p.WaitForExit();
        } catch {}
    }
}
"@

Write-Host "Compiling launcher stub..."
$tmp = [System.IO.Path]::ChangeExtension([System.IO.Path]::GetTempFileName(), ".exe")
Add-Type -TypeDefinition $csharp -OutputAssembly $tmp -OutputType ConsoleApplication -ErrorAction Stop

Write-Host "Installing to $dest ..."
Copy-Item $tmp $dest -Force
Remove-Item $tmp -Force -ErrorAction SilentlyContinue

Write-Host ""
Write-Host "Done!  Open Screen Saver Settings — 'Screensavers' will now appear in the list."
Write-Host "Note: when you pick it from the list, click Settings... to configure it."
