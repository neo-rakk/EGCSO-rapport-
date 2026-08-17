# EGCSO Rapport - Guide d'Installation Windows

## Installation Rapide (Première fois)

### Methode 1 : Automatique (recommandee)

1. **Copiez le dossier** `EGCSO_Rapport` sur le PC cible (ex: `C:\EGCSO_Rapport\`)
2. **Double-cliquez** sur `start.bat`
3. Si Node.js n'est pas installe, le script vous proposera **l'installation automatique**
4. Les dependances seront installees automatiquement
5. L'application sera compilee automatiquement (premiere fois seulement, ~2 min)
6. Le navigateur s'ouvrira automatiquement sur `http://localhost:3000`

### Methode 2 : Installation manuelle des pre-requis

Si l'installation automatique echoue (pare-feu, pas d'internet) :

1. Telechargez **Node.js LTS** depuis https://nodejs.org/
2. Installez en cochant **"Ajouter au PATH"**
3. Redemarrez l'ordinateur
4. Lancez `start.bat`

## Ce qui se passe au premier lancement

```
start.bat
  │
  ├─ [1/4] Cree C:\EGCSO_Maintenance\ si absent
  ├─ [2/4] Cree un raccourci sur le Bureau
  ├─ [3/4] npm install (6-8 min, premiere fois seulement)
  ├─ [4/4] npm run build (1-3 min, premiere fois seulement)
  └─ Ouvre le navigateur sur http://localhost:3000
```

## Fichiers Importants

| Fichier | Role |
|---|---|
| `start.bat` | **Point d'entree principal** -- verifie tout, installe, compile, demarre |
| `install-prerequisites.bat` | Installation automatique de Node.js si absent |
| `update.bat` | Lance la mise a jour automatique depuis GitHub |
| `update.mjs` | Script de mise a jour (telechargement, sauvegarde, extraction) |
| `VERSION` | Fichier contenant la version actuelle |

## Redemarrage automatique

- Le serveur redemarre automatiquement apres une mise a jour
- Le navigateur **ne s'ouvre qu'une seule fois** (pas de boucle)
- Pour arreter : fermez la fenetre CMD ou Ctrl+C

## Donnees

- Stockees dans `C:\EGCSO_Maintenance\` (separe du code)
- Base de donnees JSON : `C:\EGCSO_Maintenance\index_db.json`
- Photos et audio dans les dossiers de rapports
- **Sauvegardes** dans `backups/` (automatiques avant chaque mise a jour)
