@echo off
title EPIC EGCSO - Generateur de Rapports de Maintenance
color 0B
echo ======================================================================
echo          EPIC EGCSO - COMPLEXE SPORTIF D'ORAN - ALGERIE
echo          GENERATEUR AUTOMATIQUE DE RAPPORTS DE MAINTENANCE
echo ======================================================================
echo.
echo [1/2] Verification et installation des dependances locales...
call npm install --no-audit --no-fund
echo.
echo [2/2] Demarrage du serveur Express + React et ouverture du navigateur...
echo L'application sera accessible a l'adresse : http://localhost:3000
echo.
start http://localhost:3000
call npm run dev
pause
