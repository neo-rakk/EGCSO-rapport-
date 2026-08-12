import fs from "fs";
import path from "path";
import { execSync } from "child_process";
import https from "https";
import AdmZip from "adm-zip";
import dotenv from "dotenv";

// Load local environment variables
dotenv.config();

const VERSION_FILE = path.resolve(process.cwd(), "VERSION");
const SETTINGS_FILE = path.resolve(process.cwd(), "config/settings.json");

// Default repo coordinates
let repoOwner = "neo-rakk";
let repoName = "EGCSO-rapport-";

// Get settings to locate storageRoot and custom repo
let storageRoot = "C:\\EGCSO_Maintenance";
try {
  if (fs.existsSync(SETTINGS_FILE)) {
    const settings = JSON.parse(fs.readFileSync(SETTINGS_FILE, "utf-8"));
    if (settings.storageRoot) {
      storageRoot = settings.storageRoot;
    }
    if (settings.githubRepo) {
      const parts = settings.githubRepo.split("/");
      if (parts.length === 2) {
        repoOwner = parts[0];
        repoName = parts[1];
      }
    }
  }
} catch (err) {
  console.error("Impossible de lire la configuration de stockage, utilisation des valeurs par défaut.");
}

// Resolve storage paths (handle cross-platform dev environments safely)
function getResolvedStorageRoot() {
  if (process.platform === "win32") {
    if (path.isAbsolute(storageRoot)) return storageRoot;
    return path.resolve(process.cwd(), storageRoot);
  } else {
    if (storageRoot.includes(":\\") || storageRoot.startsWith("C:")) {
      return path.resolve(process.cwd(), "EGCSO_Maintenance");
    }
    return path.resolve(process.cwd(), storageRoot);
  }
}

const resolvedStorageRoot = getResolvedStorageRoot();

// Helper for https requests
function fetchUrl(url, headers = {}) {
  return new Promise((resolve, reject) => {
    const options = {
      headers: {
        "User-Agent": "EGCSO-Rapport-Updater",
        ...headers
      }
    };
    if (process.env.GITHUB_TOKEN) {
      options.headers["Authorization"] = `token ${process.env.GITHUB_TOKEN}`;
    }

    https.get(url, options, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        // Handle redirect
        fetchUrl(res.headers.location, headers).then(resolve).catch(reject);
        return;
      }

      if (res.statusCode !== 200) {
        reject(new Error(`La requête a échoué avec le code ${res.statusCode}`));
        return;
      }

      const chunks = [];
      res.on("data", (chunk) => chunks.push(chunk));
      res.on("end", () => resolve(Buffer.concat(chunks)));
    }).on("error", reject);
  });
}

async function startUpdate() {
  console.log("======================================================================");
  console.log("             LANCEMENT DE LA MISE À JOUR AUTOMATIQUE                 ");
  console.log("======================================================================");
  console.log("");

  // 1. SAFE AUTOMATIC BACKUP (Filet de sécurité indispensable)
  console.log("[1/6] 💾 Création d'une sauvegarde de sécurité préventive...");
  const backupsDir = path.resolve(process.cwd(), "backups");
  if (!fs.existsSync(backupsDir)) {
    fs.mkdirSync(backupsDir, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backupZipPath = path.join(backupsDir, `EGCSO_Backup_${timestamp}.zip`);

  try {
    const backupZip = new AdmZip();
    
    // Backup database index if it exists
    const dbFile = path.join(resolvedStorageRoot, "index_db.json");
    if (fs.existsSync(dbFile)) {
      backupZip.addLocalFile(dbFile, "");
    }
    
    // Backup whole reports folder
    const reportsDir = path.join(resolvedStorageRoot, "reports");
    if (fs.existsSync(reportsDir)) {
      backupZip.addLocalFolder(reportsDir, "reports");
    }

    // Backup current custom user configurations
    const configDir = path.resolve(process.cwd(), "config");
    ["settings.json", "unites.json", "categories_pannes.json"].forEach(f => {
      const p = path.join(configDir, f);
      if (fs.existsSync(p)) {
        backupZip.addLocalFile(p, "config");
      }
    });

    backupZip.writeZip(backupZipPath);
    console.log(`[OK] Sauvegarde créée avec succès : ${backupZipPath}`);
  } catch (err) {
    console.error("⚠️ Échec de la création de la sauvegarde de sécurité.");
    console.error(err.message);
    console.log("Par sécurité, la mise à jour est interrompue pour préserver vos données.");
    process.exit(1);
  }

  // 2. QUERY GITHUB API FOR LATEST VERSION
  console.log("\n[2/6] 🔍 Recherche de la dernière version sur GitHub...");
  let localVersion = "2.1.0";
  if (fs.existsSync(VERSION_FILE)) {
    localVersion = fs.readFileSync(VERSION_FILE, "utf-8").trim();
  }

  const apiUrl = `https://api.github.com/repos/${repoOwner}/${repoName}/releases/latest`;
  let latestRelease;
  try {
    const responseBuffer = await fetchUrl(apiUrl);
    latestRelease = JSON.parse(responseBuffer.toString("utf-8"));
  } catch (err) {
    console.error("⚠️ Impossible de joindre l'API de mise à jour GitHub.");
    console.error(err.message);
    console.log("\nVotre installation actuelle reste intacte et pleinement fonctionnelle.");
    process.exit(1);
  }

  const latestVersion = latestRelease.tag_name;
  console.log(`-> Version installée : ${localVersion}`);
  console.log(`-> Dernière version disponible : ${latestVersion}`);

  if (latestVersion === localVersion) {
    console.log("\n[OK] Vous possédez déjà la dernière version disponible !");
    process.exit(0);
  }

  // 3. DOWNLOAD THE RELEASE ZIP
  console.log(`\n[3/6] 📥 Téléchargement de la nouvelle version (${latestVersion})...`);
  let zipUrl = latestRelease.zipball_url;
  
  // Prefer the pre-compiled ZIP asset generated by CI/CD if available
  if (latestRelease.assets && Array.isArray(latestRelease.assets) && latestRelease.assets.length > 0) {
    const assetZip = latestRelease.assets.find(a => a.name && a.name.endsWith(".zip"));
    if (assetZip && assetZip.browser_download_url) {
      zipUrl = assetZip.browser_download_url;
      console.log(`[OK] Pack pré-compilé sélectionné : ${assetZip.name}`);
    }
  }
  const tmpDir = path.resolve(process.cwd(), "_update_tmp");
  if (fs.existsSync(tmpDir)) {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
  fs.mkdirSync(tmpDir, { recursive: true });

  const zipPath = path.join(tmpDir, "release.zip");

  try {
    const zipBuffer = await fetchUrl(zipUrl);
    fs.writeFileSync(zipPath, zipBuffer);
    console.log("[OK] Téléchargement terminé.");
  } catch (err) {
    console.error("⚠️ Échec du téléchargement du fichier de mise à jour.");
    console.error(err.message);
    console.log("\nVotre installation actuelle reste intacte et pleinement fonctionnelle.");
    process.exit(1);
  }

  // 4. EXTRACTION AND SELECTIVE COPIES (Garde-fou d'intégrité absolu)
  console.log("\n[4/6] ⚙️ Extraction et remplacement sélectif des fichiers de code...");
  try {
    const zip = new AdmZip(zipPath);
    const extractPath = path.join(tmpDir, "extracted");
    zip.extractAllTo(extractPath, true);

    // Find the single top-level directory in the GitHub release zip
    const dirs = fs.readdirSync(extractPath).filter(f => fs.statSync(path.join(extractPath, f)).isDirectory());
    if (dirs.length === 0) {
      throw new Error("Contenu de la release invalide (dossier racine manquant dans l'archive).");
    }
    const sourceDir = path.join(extractPath, dirs[0]);

    // Recursive copier that ignores config/unites.json, settings.json, categories_pannes.json, and the storage folder
    function copyRecursive(src, dest) {
      const exists = fs.existsSync(src);
      const stats = exists && fs.statSync(src);
      const isDirectory = exists && stats.isDirectory();

      if (isDirectory) {
        // Skip copy if it's the storageRoot folder itself or node_modules or git configs
        const relativePath = path.relative(sourceDir, src);
        if (relativePath === "node_modules" || relativePath === ".git" || relativePath === "backups") {
          return;
        }
        
        // Also skip resolving if we are copying onto the storageRoot folder path
        const resolvedDest = path.resolve(dest);
        if (resolvedDest === path.resolve(resolvedStorageRoot)) {
          console.log(`   [Passé] Dossier de stockage d'activité : ${relativePath}`);
          return;
        }

        if (!fs.existsSync(dest)) {
          fs.mkdirSync(dest, { recursive: true });
        }
        fs.readdirSync(src).forEach((child) => {
          copyRecursive(path.join(src, child), path.join(dest, child));
        });
      } else {
        const relativePath = path.relative(sourceDir, src);

        // Intégrité : NE JAMAIS écraser les fichiers réels de configurations utilisateur (.json)
        if (
          relativePath === "config/settings.json" ||
          relativePath === "config/unites.json" ||
          relativePath === "config/categories_pannes.json" ||
          relativePath === ".env"
        ) {
          console.log(`   [Passé] Préservation config utilisateur : ${relativePath}`);
          return;
        }

        // Copy file
        fs.copyFileSync(src, dest);
      }
    }

    copyRecursive(sourceDir, process.cwd());
    console.log("[OK] Remplacement des fichiers systèmes achevé.");
  } catch (err) {
    console.error("⚠️ Échec lors du remplacement sélectif des fichiers.");
    console.error(err.message);
    console.log("\nTentative de restauration de l'index...");
    process.exit(1);
  }

  // 5. DEPENDENCIES REINSTALLATION & FULL COMPILATION
  console.log("\n[5/6] 📦 Installation des dépendances et compilation de production...");
  try {
    console.log("   Exécution de npm install...");
    execSync("npm install --no-audit --no-fund", { stdio: "inherit", cwd: process.cwd() });
    
    console.log("   Exécution de npm run build...");
    execSync("npm run build", { stdio: "inherit", cwd: process.cwd() });
    
    console.log("[OK] Compilation effectuée.");
  } catch (err) {
    console.error("⚠️ Échec de la compilation ou de l'installation du code.");
    console.error(err.message);
    console.log("\nLa nouvelle mise à jour n'a pas pu se finaliser.");
    process.exit(1);
  }

  // 6. CLEAN UP TEMPORARY DIRECTORY
  console.log("\n[6/6] 🧹 Nettoyage des dossiers temporaires...");
  try {
    if (fs.existsSync(tmpDir)) {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
    console.log("[OK] Nettoyage accompli.");
  } catch (err) {
    console.warn("⚠️ Impossible de nettoyer le dossier temporaire _update_tmp.");
  }

  console.log("\n======================================================================");
  console.log(` 🎉 MISE À JOUR TERMINÉE AVEC SUCCÈS ! VERSION INSTALLÉE : ${latestVersion}`);
  console.log("======================================================================");
  console.log(" Vous pouvez maintenant démarrer l'application via start.bat en toute sécurité.");
  console.log("");
}

startUpdate().catch((err) => {
  console.error("Erreur générale inattendue durant la mise à jour :", err);
  process.exit(1);
});
