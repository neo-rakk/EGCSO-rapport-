# EGCSO Rapport
## Système de Rapports, Indexation et Suivi de la Maintenance — EPIC EGCSO Oran
**Établissement de Gestion du Complexe Sportif d'Oran — Service Maintenance & Travaux**

[![EGCSO Rapport CI/CD Release](https://github.com/neo-rakk/EGCSO-rapport-/actions/workflows/release.yml/badge.svg)](https://github.com/neo-rakk/EGCSO-rapport-/actions/workflows/release.yml)

---

**EGCSO Rapport** (version `2.1.0`) est une application locale, autonome, sécurisée et optimisée pour une utilisation hors-ligne. Elle permet de structurer, rédiger, indexer et retrouver instantanément l'intégralité des fiches techniques d'intervention, rapports de suivi et constats de panne sur l'ensemble des infrastructures du complexe sportif d'Oran.

---

## 🚀 Fonctionnalités Clés et Architecture

1. **Saisie Assistée de Terrain** : Formulaire guidé et dynamique pour la création rapide de trois types de documents :
   - **Rapport Technique (Intervention)** : Suivi détaillé des réparations et heures de main-d'œuvre.
   - **Constat de Panne** : Signalement initial de défaillance convertible en intervention en 1 clic.
   - **Rapport de Suivi** : Surveillance périodique des installations sensibles (piscine, CTA, etc.).
2. **Cascade Dynamique d'Hébergement** : Détermination automatique des zones, étages (ex: Village Napoli Bloc A à G) et sélection intelligente des chambres (ex: `A-101` à `A-113`) basée sur les métadonnées de structure.
3. **Indexation Normalisée** : Attribution automatique de références uniques (`EGCSO-[UNITÉ]-[TYPE]-[AAAAMMJJ]-[SEQ]`) réinitialisées chaque jour.
4. **Moteur de Recherche Plein Texte** : Filtrage croisé en temps réel par mot-clé, unité, statut de la panne, niveau de priorité, catégorie métier et plage de dates.
5. **Impression de Qualité A4** : Mises en page CSS adaptées pour une édition et impression papier ou export PDF impeccable (styles de tableau et saut de page intégrés).
6. **Compression Client des Photos** : Redimensionnement automatique des photographies sur le navigateur à une résolution max de 1200px (JPEG 80%) pour garantir un envoi ultra-léger et rapide.
7. **Sécurisation Réseau Intégrée** : Authentification HTTP Basic Auth légère (mot de passe personnalisable) pour bloquer les accès non autorisés sur le réseau local ou Wi-Fi partagé.

---

## 🎨 Comment Installer le Logo sur le Bureau (Windows)

Puisque les scripts de démarrage Windows (`.bat`) affichent par défaut une icône d'invite de commande générique, suivez cette procédure simple pour obtenir un raccourci Bureau élégant doté du logo officiel :

1. Faites un clic droit sur le fichier **`start.bat`** situé à la racine du dossier de l'application, puis cliquez sur **Créer un raccourci**.
2. Déplacez ce raccourci créé sur votre **Bureau Windows**.
3. Renommez le raccourci sur votre bureau en : **EGCSO Rapport**.
4. Faites un clic droit sur ce raccourci et sélectionnez **Propriétés**.
5. Allez dans l'onglet **Raccourci** et cliquez sur le bouton **Changer d'icône...**
6. Cliquez sur **Parcourir**, naviguez dans le dossier de l'application, ouvrez le sous-dossier `assets/`, sélectionnez le fichier **`icon.ico`**, puis validez.
7. Cliquez sur **Appliquer** puis **OK**. Votre raccourci affiche maintenant le logo officiel de l'application ! Double-cliquez dessus pour lancer l'outil.

---

## 🔄 Mise à Jour Automatique depuis GitHub (Édition Sécurisée)

L'application intègre un protocole de mise à jour sécurisé en un clic, qui télécharge directement la dernière version stable depuis votre dépôt GitHub (public ou privé) **sans jamais risquer de perdre, écraser ou altérer vos données réelles**.

### 🛡️ Le Garde-Fou : Séparation stricte Code / Données
Le système isole totalement la partie applicative de la partie usager :
- **Fichiers Système (Code)** : Mis à jour et remplacés à chaque nouvelle version.
- **Fichiers Données (Activité)** : Exclus par le fichier `.gitignore`. Vos rapports réels, vos photos avant/après, vos notes vocales, votre index `index_db.json` ainsi que vos configurations de travail (`config/unites.json`, `config/categories_pannes.json`, `config/settings.json`) ne sont **JAMAIS** modifiés ni écrasés lors d'une mise à jour.

### ⚙️ Déclenchement d'une Mise à Jour (Usager)
1. Dans l'application, ouvrez l'onglet **Paramètres** et faites défiler jusqu'à la section **Mises à Jour du Système**.
2. Cliquez sur **Vérifier les mises à jour**. L'application compare votre version locale (fichier `VERSION`) avec la dernière Release disponible sur GitHub.
3. Si une nouvelle version est disponible, l'interface affiche le numéro de version et les notes de version.
4. **Pour l'appliquer** : 
   - Fermez votre navigateur et arrêtez le serveur en fermant la console noire ou en pressant `Ctrl + C`.
   - Double-cliquez sur le fichier **`update.bat`** à la racine de l'application.
   - Le script effectue automatiquement une **sauvegarde de sécurité totale** sous forme de fichier ZIP horodaté dans le dossier `backups/`, télécharge la nouvelle version, extrait sélectivement le code applicatif, met à jour les dépendances, recompile le projet et nettoie les fichiers temporaires.
   - Double-cliquez à nouveau sur **`start.bat`** pour profiter de la nouvelle version !

---

## 💻 Guide de Publication de Versions (Développeur)

Pour publier une nouvelle mise à jour de l'application vers les postes de l'EGCSO :

1. Augmentez le numéro de version dans le fichier **`VERSION`** à la racine (ex: `2.2.0`).
2. Poussez votre code mis à jour sur votre dépôt GitHub.
3. Sur votre dépôt GitHub, créez une nouvelle **Release** :
   - Le tag de la Release doit correspondre exactement au numéro écrit dans le fichier `VERSION` (ex: `2.2.0`).
   - Nommez la Release (ex: `Mise à jour v2.2.0 - Correctifs & Améliorations`).
   - Rédigez le descriptif des changements (ce texte sera automatiquement affiché à l'usager dans l'onglet Paramètres).
   - Publiez la Release.
4. Dès sa publication, tous les postes équipés de l'application verront la mise à jour apparaître dans leur écran de paramètres.

---

## 🛠️ Configuration et Personnalisation Initiale

L'administration de l'application est 100% pilotée par sa configuration locale. Si un fichier de configuration est accidentellement supprimé, le serveur recrée automatiquement sa structure par défaut à partir des modèles `*.default.json` :

* **`config/unites.json`** : Gère l'arborescence complète du Complexe Sportif (Village Napoli, Piscines, Salles Omnisports, Stades, Terrains d'Athlétisme) avec leurs zones, étages et chambres correspondants.
* **`config/categories_pannes.json`** : Liste les catégories de pannes et métiers d'interventions (Électricité, CVC, Plomberie, Peinture, etc.).
* **`config/settings.json`** : Gère le dossier de stockage de l'activité (`storageRoot`), le nom de l'établissement et le format normalisé de vos références.
* **`.env`** : Contient vos secrets d'environnement locaux (comme `APP_PASSWORD` pour changer le mot de passe de sécurité de l'application, ou `GITHUB_TOKEN` pour un dépôt privé).

---

**EPIC EGCSO Oran — Direction Technique**  
*Développé en partenariat avec GM Connect, Version 2.1.0 stable (Août 2026).*
