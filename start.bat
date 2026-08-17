@echo off
chcp 65001 >nul 2>&1
title EGCSO Rapport (Production)
color 0B
setlocal enabledelayedexpansion

:: Marqueur pour n'ouvrir le navigateur qu'au PREMIER demarrage
set "FIRST_RUN=1"

echo ======================================================================
echo                     EGCSO Rapport (EPIC EGCSO ORAN)
echo               SYSTEME DE RAPPORTS ET SUIVI DE MAINTENANCE
echo ======================================================================
echo.

:: =========================================================================
:: ETAPE 0 : VERIFICATION AUTOMATIQUE DES PRE-REQUIS
:: =========================================================================
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo.
    echo  [PRE-REQUIS] Node.js n'est pas installe sur ce poste.
    echo.
    echo  Le programme va lancer l'installation automatique des pre-requis.
    echo  Une connexion Internet est necessaire.
    echo.
    pause
    call "%~dp0install-prerequisites.bat"
    if %errorlevel% neq 0 (
        echo [ERREUR] Les pre-requis n'ont pas pu etre installes.
        echo  Consultez le message ci-dessus pour resoudre le probleme.
        pause
        exit /b 1
    )
    :: Le PATH a pu changer, on relance start.bat dans un nouveau process
    echo.
    echo  [Info] Redemarrage de l'application avec le PATH mis a jour...
    echo  Fermeture de cette fenetre dans 3 secondes...
    timeout /t 3 /nobreak >nul
    start "" cmd /c "%~f0"
    exit /b 0
)

:: Verifier aussi npm
where npm >nul 2>&1
if %errorlevel% neq 0 (
    echo [PRE-REQUIS] npm non trouve malgre Node.js installe.
    echo  Si vous venez d'installer Node.js, fermez et relancez ce script.
    pause
    exit /b 1
)

:: Afficher les versions detectees
for /f "tokens=*" %%v in ('node --version') do set "NODE_VER=%%v"
for /f "tokens=*" %%v in ('npm --version') do set "NPM_VER=%%v"
echo  [Pre-requis OK] Node.js !NODE_VER! / npm v!NPM_VER!
echo.

:: =========================================================================
:: ETAPE 1 : CREATION DU DOSSIER DE STOCKAGE
:: =========================================================================
if not exist "C:\EGCSO_Maintenance" (
    echo  [1/4] [Initialisation] Creation du dossier de stockage C:\EGCSO_Maintenance...
    mkdir "C:\EGCSO_Maintenance" 2>nul
    mkdir "C:\EGCSO_Maintenance\reports" 2>nul
    mkdir "C:\EGCSO_Maintenance\exports_pdf" 2>nul
    echo  [OK] Dossier de stockage pret.
    echo.
) else (
    echo  [1/4] [OK] Dossier de stockage deja present.
    echo.
)

:: =========================================================================
:: ETAPE 2 : RACCOURCI BUREAU
:: =========================================================================
set "SHORTCUT_PATH=%USERPROFILE%\Desktop\EGCSO Rapport.lnk"
if not exist "%SHORTCUT_PATH%" (
    echo  [2/4] [Initialisation] Creation du raccourci Bureau...
    echo set WshShell = WScript.CreateObject^("WScript.Shell"^) > "%temp%\CreateShortcut.vbs"
    echo set oShellLink = WshShell.CreateShortcut^("%SHORTCUT_PATH%"^) >> "%temp%\CreateShortcut.vbs"
    echo oShellLink.TargetPath = "%~dp0start.bat" >> "%temp%\CreateShortcut.vbs"
    echo oShellLink.WorkingDirectory = "%~dp0" >> "%temp%\CreateShortcut.vbs"
    echo oShellLink.Description = "EGCSO Rapport - Suivi de Maintenance" >> "%temp%\CreateShortcut.vbs"
    echo oShellLink.IconLocation = "%~dp0public\icon.ico, 0" >> "%temp%\CreateShortcut.vbs"
    echo oShellLink.Save >> "%temp%\CreateShortcut.vbs"
    cscript //nologo "%temp%\CreateShortcut.vbs" >nul 2>&1
    del "%temp%\CreateShortcut.vbs" 2>nul
    echo  [OK] Raccourci Bureau cree.
    echo.
) else (
    echo  [2/4] [OK] Raccourci Bureau deja present.
    echo.
)

:: =========================================================================
:: ETAPE 3 : INSTALLATION DES DEPENDANCES
:: =========================================================================
if not exist "node_modules" (
    echo  [3/4] Installation des dependances - cela peut prendre plusieurs minutes...
    echo  ---------------------------------------------------------------
    echo.
    call npm install --progress=false
    echo.
    if %errorlevel% neq 0 (
        echo  [ERREUR] L'installation des dependances a echoue.
        echo  Verifiez votre connexion Internet et relancez start.bat
        pause
        exit /b 1
    )
    echo  [OK] Dependances installees avec succes.
    echo.
) else (
    echo  [3/4] [OK] Dependances deja installees.
    echo.
)

:: =========================================================================
:: ETAPE 4 : COMPILATION DE L'APPLICATION
:: =========================================================================
if not exist ".next\standalone\.next\static" (
    echo  [4/4] Premiere compilation de l'application...
    echo  [INFO] Cette etape dure environ 1 a 3 minutes.
    echo  ---------------------------------------------------------------
    echo.
    call npm run build
    echo.
    if %errorlevel% neq 0 (
        echo  [ERREUR] La compilation a echoue.
        echo  Consultez les erreurs ci-dessus.
        pause
        exit /b 1
    )
    echo  [OK] Compilation terminee avec succes.
    echo.
) else (
    echo  [4/4] [OK] Application deja compilee.
    echo.
)

:: =========================================================================
:: BOUCLE DU SERVEUR AVEC REPRISE AUTOMATIQUE
:: =========================================================================
:SERVER_LOOP

:: Garde-fou : attente si mise a jour en cours
if exist "update_in_progress.lock" (
    echo  [Mise a jour] Installation en cours, attente...
    timeout /t 3 /nobreak >nul
    goto SERVER_LOOP
)

:: Apres une mise a jour, il faut recompiler
if exist "rebuild_required.flag" (
    echo  [Mise a jour] Recompilation apres mise a jour...
    del "rebuild_required.flag" 2>nul
    call npm install --progress=false
    call npm run build
    echo  [OK] Recompilation terminee.
    echo.
)

:: Ouvrir le navigateur UNIQUEMENT au premier demarrage
if "%FIRST_RUN%"=="1" (
    echo.
echo ======================================================================
echo  Demarrage du serveur EGCSO Rapport

echo  URL : http://localhost:3000
echo  Node.js : !NODE_VER! / npm : v!NPM_VER!
echo ======================================================================
echo.
    start http://localhost:3000
    set "FIRST_RUN=0"
) else (
    echo.
    echo  [Serveur] Redemarrage a !time!
    echo.
)

if exist ".next\standalone\server.js" (
    node .next\standalone\server.js
) else (
    call npm start
)

echo.
echo  [Serveur] Arrete. Redemarrage automatique dans 5 secondes...
echo  Presser Ctrl+C pour arreter definitivement
timeout /t 5 /nobreak >nul
goto SERVER_LOOP
