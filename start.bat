@echo off
title EPIC EGCSO - Generateur de Rapports de Maintenance (Production)
color 0B
echo ======================================================================
echo          EPIC EGCSO - COMPLEXE SPORTIF D'ORAN - ALGERIE
echo          GENERATEUR AUTOMATIQUE DE RAPPORTS DE MAINTENANCE
echo ======================================================================
echo.
if not exist "dist" (
    echo [1/2] Premier lancement détecté. Installation des dépendances...
    call npm install --no-audit --no-fund
    echo.
    echo [2/2] Compilation de l'application en mode Production...
    call npm run build
) else (
    echo [OK] Application déjà compilée. Lancement de production rapide...
)
echo.
echo Démarrage du serveur de Production...
echo L'application sera accessible à l'adresse : http://localhost:3000
echo.
start http://localhost:3000
call npm start
pause
