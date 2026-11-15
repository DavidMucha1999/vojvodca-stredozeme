@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo.
echo  Vojvodca Stredozeme - premenovanie a ikona
echo  ------------------------------------------
echo  1. Odstrani stary subor phaser.html (hra je teraz "Vojvodca Stredozeme.html").
if exist "phaser.html" del "phaser.html"
if exist "dist\phaser-single.html" del "dist\phaser-single.html"
echo     Hotovo.
echo  2. Vytvori odkaz s ikonou v tomto priecinku a na Plochu.
powershell -NoProfile -ExecutionPolicy Bypass -Command "$w = New-Object -ComObject WScript.Shell; foreach ($d in @((Get-Location).Path, [Environment]::GetFolderPath('Desktop'))) { $s = $w.CreateShortcut((Join-Path $d 'Vojvodca Stredozeme.lnk')); $s.TargetPath = (Join-Path (Get-Location).Path 'Vojvodca Stredozeme.html'); $s.WorkingDirectory = (Get-Location).Path; $s.IconLocation = (Join-Path (Get-Location).Path 'assets\ikona.ico') + ',0'; $s.Description = 'Vojvodca Stredozeme'; $s.Save() }"
if errorlevel 1 (echo     Odkaz sa nepodarilo vytvorit.) else (echo     Hotovo. Hru spustis odkazom "Vojvodca Stredozeme" na Ploche alebo v tomto priecinku.)
echo.
pause
(goto) 2>nul & del "%~f0"
