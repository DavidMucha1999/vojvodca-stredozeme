# Vojvodca Stredozeme – odinštalovanie počítačovej verzie. Uložené hry (Dokumenty\Vojvodca Stredozeme) a priečinok projektu ostanú.
$Name = 'Vojvodca Stredozeme'
$Dest = Join-Path $env:LOCALAPPDATA "Programs\$Name"
Get-Process -Name $Name -ErrorAction SilentlyContinue | Stop-Process -Force
Start-Sleep -Milliseconds 500
foreach ($l in (Join-Path ([Environment]::GetFolderPath('Desktop')) "$Name.lnk"), (Join-Path ([Environment]::GetFolderPath('Programs')) "$Name.lnk")) { Remove-Item -Force -ErrorAction SilentlyContinue $l }
Remove-Item -Force -ErrorAction SilentlyContinue 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Uninstall\VojvodcaStredozeme'
Set-Location $env:TEMP
Remove-Item -Recurse -Force -ErrorAction SilentlyContinue $Dest
Write-Host 'Vojvodca Stredozeme bol odinštalovaný. Uložené hry ostali v Dokumenty\Vojvodca Stredozeme.'
Start-Sleep -Seconds 3
