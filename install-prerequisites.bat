@echo off
chcp 65001 >nul 2>&1
title EGCSO Rapport - Installation des Pre-requis
color 0E
setlocal enabledelayedexpansion

echo.
echo ======================================================================
echo          EGCSO Rapport - INSTALLATION AUTOMATIQUE DES PRE-REQUIS
echo          COMPLEXE SPORTIF D'ORAN - ALGERIE
echo ======================================================================
echo.
echo  Ce script va verifier et installer automatiquement :
echo    1. Node.js  (moteur JavaScript serveur)
echo    2. npm       (gestionnaire de paquets, inclus avec Node.js)
echo.
echo  AUCUNE INTERVENTION MANUELLE N'EST REQUISE.
echo.
echo  Appuyez sur une touche pour continuer...
pause >nul

:: =========================================================================
:: ETAPE 1 : NODE.JS
:: =========================================================================
echo.
echo  [1/3] Verification de Node.js...
where node >nul 2>&1
if %errorlevel% equ 0 (
    for /f "tokens=*" %%v in ('node --version') do set "NODE_VER=%%v"
    echo  [OK] Node.js est deja installe : !NODE_VER!
    goto :check_npm
)

echo.
echo  ========================================================
echo   Node.js n'est PAS installe.
echo  ========================================================
echo.
echo  L'installateur va telecharger et installer Node.js v22 LTS.
echo  Taille : ~30 MB   Duree estimee : 1 a 3 minutes
echo.
echo  --------------------------------------------------------
echo.
echo  [Telechargement en cours, veuillez patienter...]
echo.

set "NODE_LTS_VERSION=22.17.0"
set "NODE_MSI=node-v%NODE_LTS_VERSION%-x64.msi"
set "NODE_URL=https://nodejs.org/dist/v%NODE_LTS_VERSION%/%NODE_MSI%"
set "DOWNLOAD_DIR=%TEMP%\EGCSO_Prerequis"

if not exist "%DOWNLOAD_DIR%" mkdir "%DOWNLOAD_DIR%"
set "NODE_MSI_PATH=%DOWNLOAD_DIR%\%NODE_MSI%"

:: Afficher une barre de progression pendant le telechargement
echo  Methode 1 : PowerShell...
powershell -NoProfile -ExecutionPolicy Bypass -Command "
    [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12;
    $url = '%NODE_URL%';
    $out = '%NODE_MSI_PATH%';
    try {
        Write-Host '  [>  ] Connexion au serveur nodejs.org...';
        $req = Invoke-WebRequest -Uri $url -OutFile $out -UseBasicParsing -PassThru;
        Write-Host '  [OK] Telechargement termine.' "$($req.Headers.'Content-Length' / 1MB) MB";
        exit 0
    } catch {
        Write-Host '  [!!] Echec du telechargement.';
        exit 1
    }
"

if not exist "%NODE_MSI_PATH%" (
    echo.
    echo  [Info] PowerShell echoue, tentative avec certutil...
    echo.
    certutil -urlcache -split -f "%NODE_URL%" "%NODE_MSI_PATH%" >nul 2>&1
)

if not exist "%NODE_MSI_PATH%" (
    echo.
    echo  ========================================================
echo   [ERREUR] Impossible de telecharger Node.js automatiquement.
echo  ========================================================
echo.
echo  Causes possibles :
echo    - Pas de connexion Internet
echo    - Pare-feu entreprise bloquant le telechargement
echo    - Proxy necessitant une configuration manuelle
    echo.
echo  Solution manuelle :
echo    1. Ouvrez https://nodejs.org/ dans votre navigateur
echo    2. Telechargez la version LTS (recommandee)
echo    3. Installez-la en cochant "Add to PATH"
echo    4. Redemarrez ce script
    echo.
    pause
    exit /b 1
)

echo.
echo  [Installation] Node.js v%NODE_LTS_VERSION% en cours...
echo  [INFO] L'installateur s'execute silencieusement (sans fenetre)
echo  [INFO] Cela prend environ 30 secondes...

msiexec /i "%NODE_MSI_PATH%" /qn /norestart

if %errorlevel% neq 0 (
    echo  [ERREUR] L'installation a echouee.
    pause
    exit /b 1
)

:: Nettoyage
del "%NODE_MSI_PATH%" 2>nul

echo  [OK] Node.js v%NODE_LTS_VERSION% installe avec succes.

:: Rafraichir le PATH
echo  [INFO] Mise a jour du PATH pour cette session...
for /f "tokens=2,*" %%a in ('reg query "HKLM\SYSTEM\CurrentControlSet\Control\Session Manager\Environment" /v Path 2^>nul ^| findstr Path') do set "SYS_PATH=%%b"
for /f "tokens=2,*" %%a in ('reg query "HKCU\Environment" /v Path 2^>nul ^| findstr Path') do set "USR_PATH=%%b"
set "PATH=%SYS_PATH%;%USR_PATH%;%PATH%"

:: Verifier
echo.
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo  ========================================================
echo  [IMPORTANT] Node.js installe mais PATH pas encore actif.
echo  ========================================================
echo.
echo  FERMETZ cette fenetre et relancez start.bat.
echo  Apres le redemarrage de la fenetre, Node.js sera reconnu.
echo.
    pause
    exit /b 0
)

for /f "tokens=*" %%v in ('node --version') do set "NODE_VER=%%v"
echo  [OK] Node.js !NODE_VER! est maintenant disponible.

:: =========================================================================
:: ETAPE 2 : VERIFICATION NPM
:: =========================================================================
:check_npm
echo.
echo  [2/3] Verification de npm...
where npm >nul 2>&1
if %errorlevel% equ 0 (
    for /f "tokens=*" %%v in ('npm --version') do set "NPM_VER=%%v"
    echo  [OK] npm v!NPM_VER! est disponible.
    goto :check_bun
)

echo  [ERREUR] npm non trouve. Redemarrez ce script.
pause
exit /b 1

:: =========================================================================
:: ETAPE 3 : BUN (OPTIONNEL)
:: =========================================================================
:check_bun
echo.
echo  [3/3] Verification de bun (optionnel, accelere l'installation)...
where bun >nul 2>&1
if %errorlevel% equ 0 (
    for /f "tokens=*" %%v in ('bun --version') do set "BUN_VER=%%v"
    echo  [OK] bun v!BUN_VER! est installe.
    goto :done
)

echo  [Info] bun n'est pas installe. Ce n'est pas obligatoire.
echo  L'application fonctionnera avec npm.
echo.
echo  Voulez-vous installer bun pour de meilleures performances ? (O/N)
set /p INSTALL_BUN=
if /i "!INSTALL_BUN!"=="O" (
    echo.
    echo  [Installation] bun en cours...
    powershell -NoProfile -ExecutionPolicy Bypass -Command "$ProgressPreference='SilentlyContinue'; irm bun.sh/install.ps1 | iex"
    where bun >nul 2>&1
    if !errorlevel! equ 0 (
        for /f "tokens=*" %%v in ('bun --version') do set "BUN_VER=%%v"
        echo  [OK] bun v!BUN_VER! installe.
    ) else (
        echo  [Info] Installation de bun echouee. npm sera utilise.
    )
) else (
    echo  [Info] bun sera ignore. npm sera utilise.
)

:: =========================================================================
:: FIN
:: =========================================================================
:done
echo.
echo ======================================================================
echo  [SUCCES] TOUS LES PRE-REQUIS SONT REMPLIS !
echo ======================================================================
echo.
echo  Node.js : !NODE_VER!
echo  npm    : v!NPM_VER!
where bun >nul 2>&1
if !errorlevel! equ 0 (
    for /f "tokens=*" %%v in ('bun --version') do echo  bun    : v%%v
) else (
    echo  bun    : non installe (optionnel)
)
echo.
echo  Fermez cette fenetre et relancez start.bat.
echo.
pause
exit /b 0
