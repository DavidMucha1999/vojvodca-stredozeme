# Vojvodca Stredozeme – inštalácia počítačovej verzie (Windows). Spúšťa ju „Nainštalovať hru.bat“ v priečinku hry.
# Stiahne Electron (okno hry) a rcedit (ikona programu), vytvorí program v %LOCALAPPDATA%\Programs\Vojvodca Stredozeme,
# zástupcov na ploche a v ponuke Štart a položku v Aplikáciách (odinštalovanie). Hra sa načítava z priečinka projektu,
# preto pri úpravách hry netreba nič preinštalovať. Uložené hry sú v Dokumenty\Vojvodca Stredozeme\Uloženia.
$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
$ElectronVersion = '33.2.1'
$AppVersion = '1.0.0'
$Name = 'Vojvodca Stredozeme'
$Here = $PSScriptRoot
$GameDir = Split-Path -Parent $Here
$Dest = Join-Path $env:LOCALAPPDATA "Programs\$Name"
$Exe = Join-Path $Dest "$Name.exe"
$App = Join-Path $Dest 'resources\app'
$Tmp = Join-Path $env:TEMP 'vojvodca-instalacia'
$Utf8 = New-Object System.Text.UTF8Encoding $false

function Download($url, $file) {
    if (Get-Command curl.exe -ErrorAction SilentlyContinue) { & curl.exe -L --fail --silent --show-error -o $file $url; if ($LASTEXITCODE -ne 0) { throw "Sťahovanie zlyhalo: $url" } }
    else { Invoke-WebRequest -UseBasicParsing -Uri $url -OutFile $file }
}

Write-Host ''
Write-Host '  VOJVODCA STREDOZEME – inštalácia počítačovej verzie' -ForegroundColor Yellow
Write-Host '  Autor a vývojár hry: Dávid Mucha' -ForegroundColor DarkYellow
Write-Host ''
if (-not (Test-Path (Join-Path $GameDir "$Name.html"))) { throw "V priečinku $GameDir chýba súbor $Name.html. Spusti inštaláciu z priečinka hry." }
New-Item -ItemType Directory -Force -Path $Tmp | Out-Null
Get-Process -Name $Name -ErrorAction SilentlyContinue | Stop-Process -Force   # bežiaca hra by blokovala súbory

$verFile = Join-Path $Dest 'electron-verzia.txt'
$have = if (Test-Path $verFile) { (Get-Content $verFile -Raw).Trim() } else { '' }
if (-not (Test-Path $Exe) -or $have -ne $ElectronVersion) {
    Write-Host "  1/4 Sťahujem Electron $ElectronVersion (asi 110 MB)..."
    $zip = Join-Path $Tmp "electron-$ElectronVersion.zip"
    if (-not (Test-Path $zip) -or (Get-Item $zip).Length -lt 50MB) { Download "https://github.com/electron/electron/releases/download/v$ElectronVersion/electron-v$ElectronVersion-win32-x64.zip" $zip }
    if ((Get-Item $zip).Length -lt 50MB) { throw 'Stiahnutý súbor Electronu je neúplný. Skús inštaláciu znova.' }
    Write-Host '  2/4 Rozbaľujem...'
    if (Test-Path $Dest) { Remove-Item -Recurse -Force $Dest }
    New-Item -ItemType Directory -Force -Path $Dest | Out-Null
    if (Get-Command tar.exe -ErrorAction SilentlyContinue) { & tar.exe -xf $zip -C $Dest; if ($LASTEXITCODE -ne 0) { throw 'Rozbalenie zlyhalo.' } }
    else { Expand-Archive -Force -Path $zip -DestinationPath $Dest }
    Rename-Item (Join-Path $Dest 'electron.exe') "$Name.exe"
    Remove-Item -Force -ErrorAction SilentlyContinue (Join-Path $Dest 'resources\default_app.asar')
    [IO.File]::WriteAllText($verFile, $ElectronVersion, $Utf8)
    $iconPending = $true
} else { Write-Host '  1/4 Electron je už nainštalovaný – aktualizujem len hru.'; Write-Host '  2/4 -'; $iconPending = $false }

Write-Host '  3/4 Kopírujem súbory hry a ikonu...'
New-Item -ItemType Directory -Force -Path $App | Out-Null
foreach ($f in 'main.js', 'preload.js', 'package.json', 'ikona.png', 'ikona.ico', 'uninstall.ps1') { Copy-Item -Force (Join-Path $Here $f) (Join-Path $App $f) }
[IO.File]::WriteAllText((Join-Path $App 'config.json'), (@{ gameDir = $GameDir } | ConvertTo-Json), $Utf8)
if ($iconPending) {
    try {
        $rc = Join-Path $Tmp 'rcedit-x64.exe'
        if (-not (Test-Path $rc)) { Download 'https://github.com/electron/rcedit/releases/download/v2.0.0/rcedit-x64.exe' $rc }
        & $rc $Exe --set-icon (Join-Path $App 'ikona.ico') --set-version-string 'ProductName' $Name --set-version-string 'FileDescription' $Name --set-version-string 'CompanyName' 'Dávid Mucha' --set-version-string 'LegalCopyright' 'Dávid Mucha' --set-file-version $AppVersion --set-product-version $AppVersion
    } catch { Write-Host '      (ikonu programu sa nepodarilo nastaviť – zástupcovia ju majú aj tak)' -ForegroundColor DarkGray }
}

Write-Host '  4/4 Vytváram zástupcov na ploche a v ponuke Štart...'
$sh = New-Object -ComObject WScript.Shell
$links = @((Join-Path ([Environment]::GetFolderPath('Desktop')) "$Name.lnk"), (Join-Path ([Environment]::GetFolderPath('Programs')) "$Name.lnk"))
foreach ($l in $links) {
    $s = $sh.CreateShortcut($l); $s.TargetPath = $Exe; $s.WorkingDirectory = $Dest; $s.IconLocation = (Join-Path $App 'ikona.ico') + ',0'; $s.Description = 'Vojvodca Stredozeme – strategická hra (Dávid Mucha)'; $s.Save()
}
# položka v Nastavenia → Aplikácie (odinštalovanie; uložené hry ostanú)
$reg = 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Uninstall\VojvodcaStredozeme'
New-Item -Force -Path $reg | Out-Null
Set-ItemProperty $reg DisplayName $Name
Set-ItemProperty $reg DisplayVersion $AppVersion
Set-ItemProperty $reg Publisher 'Dávid Mucha'
Set-ItemProperty $reg DisplayIcon (Join-Path $App 'ikona.ico')
Set-ItemProperty $reg InstallLocation $Dest
Set-ItemProperty $reg UninstallString ('powershell.exe -NoProfile -ExecutionPolicy Bypass -File "' + (Join-Path $App 'uninstall.ps1') + '"')
Set-ItemProperty $reg NoModify 1
Set-ItemProperty $reg NoRepair 1

Write-Host ''
Write-Host '  Hotovo! Hra je na ploche a v ponuke Štart pod menom „Vojvodca Stredozeme“.' -ForegroundColor Green
Write-Host '  Uložené hry: Dokumenty\Vojvodca Stredozeme\Uloženia' -ForegroundColor Green
Write-Host '  Spúšťam hru...'
Start-Process -FilePath $Exe -WorkingDirectory $Dest
