@echo off
chcp 65001 >nul
title Vojvodca Stredozeme - instalacia
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0desktop\install.ps1"
if errorlevel 1 (
  echo.
  echo Instalacia sa nepodarila. Skontroluj pripojenie na internet a skus to znova.
)
echo.
pause
