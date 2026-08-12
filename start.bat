@echo off
title EGCSO Rapport (Production)
color 0B
echo ======================================================================
echo                     EGCSO Rapport (EPIC EGCSO ORAN)
echo               SYSTÈME DE RAPPORTS ET SUIVI DE MAINTENANCE
echo ======================================================================
echo.

:: 1. CRÉATION AUTOMATIQUE DU RÉPERTOIRE DE STOCKAGE EXTERNE (Garde-fou Sécurité)
if not exist "C:\EGCSO_Maintenance" (
    echo [Initialisation] Création du dossier de stockage central : C:\EGCSO_Maintenance...
    mkdir "C:\EGCSO_Maintenance" 2>nul
    mkdir "C:\EGCSO_Maintenance\reports" 2>nul
    mkdir "C:\EGCSO_Maintenance\photos" 2>nul
    echo [OK] Dossier de stockage prêt.
    echo.
)

:: 2. GÉNÉRATION AUTOMATIQUE DU RACCOURCI SUR LE BUREAU AVEC LOGO OFFICIEL
set "SHORTCUT_PATH=%USERPROFILE%\Desktop\EGCSO Rapport.lnk"
if not exist "%SHORTCUT_PATH%" (
    echo [Initialisation] Premier lancement détecté...
    echo [Initialisation] Création automatique du raccourci sur votre Bureau Windows...
    
    :: Génération à la volée d'un script VBS pour créer le raccourci Windows natif
    echo set WshShell = WScript.CreateObject^("WScript.Shell"^) > "%temp%\CreateShortcut.vbs"
    echo set oShellLink = WshShell.CreateShortcut^("%SHORTCUT_PATH%"^) >> "%temp%\CreateShortcut.vbs"
    echo oShellLink.TargetPath = "%~dp0start.bat" >> "%temp%\CreateShortcut.vbs"
    echo oShellLink.WorkingDirectory = "%~dp0" >> "%temp%\CreateShortcut.vbs"
    echo oShellLink.Description = "EGCSO Rapport - Suivi de Maintenance" >> "%temp%\CreateShortcut.vbs"
    echo oShellLink.IconLocation = "%~dp0assets\icon.ico" >> "%temp%\CreateShortcut.vbs"
    echo oShellLink.Save >> "%temp%\CreateShortcut.vbs"
    
    :: Exécution et nettoyage du script temporaire
    cscript //nologo "%temp%\CreateShortcut.vbs"
    del "%temp%\CreateShortcut.vbs"
    
    echo [OK] Raccourci "EGCSO Rapport" créé avec succès sur votre Bureau !
    echo.
)

:: 3. BOUCLE DU SERVEUR DE PRODUCTION AVEC REPRISE AUTOMATIQUE POST-UPDATE
:SERVER_LOOP
if not exist "dist" (
    echo [Préparation] Compilation initiale détectée. Installation des dépendances...
    call npm install --no-audit --no-fund
    echo.
    echo [Préparation] Compilation de l'application en mode Production...
    call npm run build
) else (
    echo [OK] Code applicatif à jour et pré-compilé.
)
echo.
echo Démarrage du serveur de Production EGCSO Rapport...
echo L'application est accessible à l'adresse : http://localhost:3000
echo.
start http://localhost:3000
call npm start

echo.
echo [Information] Redémarrage automatique du serveur suite à une mise à jour ou interruption...
timeout /t 3 /nobreak >nul
goto SERVER_LOOP

