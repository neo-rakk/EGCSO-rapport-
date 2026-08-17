@echo off
chcp 65001 >nul 2>&1
title EGCSO Rapport - Mise a Jour Automatique
color 0E
setlocal enabledelayedexpansion

echo ======================================================================
echo          EGCSO Rapport - COMPLEXE SPORTIF D'ORAN - ALGERIE
echo          MISE A JOUR AUTOMATIQUE DU SYSTEME DE MAINTENANCE
echo ======================================================================
echo.

:: Verification pre-requis
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERREUR] Node.js n'est pas installe.
    echo  Lancez d'abord start.bat
    pause
    exit /b 1
)

echo Lancement du script de mise a jour securise...
echo.
node update.mjs

if %errorlevel% equ 0 (
    echo.
    echo [OK] Mise a jour terminee.
    echo.
    echo  [Recompilation] Installation des nouvelles dependances...
    call npm install --progress=false
    echo.
    echo  [Recompilation] Compilation de l'application...
    call npm run build
    echo.
    echo ======================================================================
echo  [SUCCES] Mise a jour et recompilation terminees !
echo ======================================================================
    echo.
    echo  Le serveur va demarrer automatiquement via start.bat.
) else (
    echo.
    echo  [ERREUR] La mise a jour a echoue. Consultez les erreurs ci-dessus.
)

pause
