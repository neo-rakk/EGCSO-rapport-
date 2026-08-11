# Générateur de Rapports de Maintenance — EPIC EGCSO
## Établissement de Gestion du Complexe Sportif d'Oran — Service Maintenance

Cette application **locale, autonome et 100% hors-ligne** a été développée pour le Service Maintenance de l'**EPIC EGCSO d'Oran** afin de rédiger, structurer, indexer, et retrouver l'intégralité des rapports techniques d'intervention, constats et suivis de pannes du complexe.

---

## 🚀 Fonctionnalités Clés

1. **Génération de Rapports Techniques, Constats et Rapports de Suivi** via un formulaire dynamique guidé.
2. **Cascade Intelligente** : Sélection simplifiée de la localisation selon les unités (ex: sélection Bloc A ➔ Étage 2 ➔ Chambres A-201 à A-213 pour le Village Napoli).
3. **Indexation Automatisée** : Génération d'une référence unique normalisée `EGCSO-[UNITÉ]-[TYPE]-[DATE]-[SEQ]` réinitialisée chaque jour.
4. **Recherche Multi-critères** : Moteur de recherche plein texte instantané avec filtres par unité, catégorie de panne, statut, priorité et plage de dates.
5. **Impression & Export PDF** : Styles d'impression CSS intégrés dans les rapports HTML autonomes pour une mise en page A4 impeccable (bouton "Imprimer / Exporter PDF").
6. **Sauvegarde Portative** : Données centralisées dans un seul dossier racine (`C:\EGCSO_Maintenance` par défaut), facilement copiable sur clé USB pour une sauvegarde totale.
7. **Reconstruction Automatique** : Possibilité de régénérer la base d'indexation en scannant le dossier des rapports en un clic.

---

## 🛠 Prérequis d'Installation

Avant de lancer l'application en local sur un ordinateur de la direction ou de l'atelier technique, assurez-vous d'avoir installé **Node.js** :

1. Téléchargez la version **LTS** recommandée de Node.js depuis le site officiel : **[https://nodejs.org/](https://nodejs.org/)**
2. Lancez l'installateur et conservez toutes les options par défaut.
3. Vérifiez l'installation en ouvrant un terminal (Invite de commande Windows) et en tapant :
   ```bash
   node -v
   npm -v
   ```

---

## 💻 Premier Lancement de l'Application

L'application a été conçue pour être lancée en un seul clic, sans aucune compétence technique requise :

1. **Décompressez l'archive** de l'application dans le dossier de votre choix (par exemple dans `C:\EGCSO_App\`).
2. Double-cliquez sur le fichier **`start.bat`** situé à la racine du dossier.
3. Le script va :
   - Installer automatiquement les dépendances requises lors du premier démarrage.
   - Démarrer le serveur local de l'application.
   - Ouvrir automatiquement votre navigateur internet par défaut à l'adresse **`http://localhost:3000`**.
4. Vous êtes prêt à l'emploi ! Laissez la fenêtre noire du terminal ouverte tant que vous utilisez l'application.

---

## 📂 Gestion du Dossier de Stockage et Sauvegarde

Toutes vos données (rapports HTML, métadonnées, photos, index de recherche) sont logées à l'intérieur du dossier racine de stockage.

- Par défaut, ce dossier est situé dans `./EGCSO_Maintenance` au sein de l'application.
- Vous pouvez à tout moment **modifier ce dossier racine** dans l'onglet **Paramètres** de l'application (ex: renseigner `C:\EGCSO_Maintenance` ou une lettre de lecteur réseau partagé).
- **Pour effectuer une sauvegarde (Backup)** : Copiez ou compressez simplement l'intégralité de ce dossier racine sur une clé USB ou un disque dur externe. Toutes vos données y sont préservées de manière autonome.

---

## ⚙️ Administration : Modifier la Structure des Unités ou Catégories

Conformément au cahier des charges, l'administration est entièrement modifiable via l'onglet **Paramètres** grâce à des fichiers de configuration simples sans toucher au code source :

- **`unites.json`** : Modifie la structure des blocs, étages, chambres, gradins et bassins du complexe sportif d'Oran.
- **`categories_pannes.json`** : Permet d'ajouter ou de retirer des catégories métiers de pannes d'intervention (Électricité, Hydraulique, CVC, etc.).

---

**EPIC EGCSO Oran — Service Maintenance & Travaux**  
*Développé pour GM Connect, Août 2026.*
