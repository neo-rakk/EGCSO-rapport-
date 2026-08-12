import fs from "fs";
import path from "path";
import { execSync } from "child_process";
import https from "https";
import AdmZip from "adm-zip";
import dotenv from "dotenv";

// Load local environment variables
dotenv.config();

// Ensure update_in_progress.lock is always deleted on exit
process.on("exit", () => {
  try {
    const lockFile = path.resolve(process.cwd(), "update_in_progress.lock");
    if (fs.existsSync(lockFile)) {
      fs.unlinkSync(lockFile);
      console.log("🧹 Verrou update_in_progress.lock libéré.");
    }
  } catch (err) {
    // Ignore error
  }
});

const VERSION_FILE = path.resolve(process.cwd(), "VERSION");
const PACKAGE_JSON_FILE = path.resolve(process.cwd(), "package.json");
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
      const cleanRepo = settings.githubRepo.trim().replace(/\/+$/, "");
      const parts = cleanRepo.split("/");
      if (parts.length === 2) {
        repoOwner = parts[0].trim();
        repoName = parts[1].trim();
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
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) EGCSO-Rapport-Updater",
        "Accept": "application/vnd.github.v3+json",
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

// Semver comparison helper
function isNewerVersion(latest, current) {
  try {
    const lParts = latest.replace(/[^0-9.]/g, "").split(".").map(n => parseInt(n, 10) || 0);
    const cParts = current.replace(/[^0-9.]/g, "").split(".").map(n => parseInt(n, 10) || 0);
    for (let i = 0; i < Math.max(lParts.length, cParts.length); i++) {
      const l = lParts[i] || 0;
      const c = cParts[i] || 0;
      if (l > c) return true;
      if (l < c) return false;
    }
  } catch (err) {}
  return latest !== current;
}

// Get current local version dynamically
function getLocalVersion() {
  if (fs.existsSync(VERSION_FILE)) {
    const content = fs.readFileSync(VERSION_FILE, "utf-8").trim();
    if (content) return content;
  }
  if (fs.existsSync(PACKAGE_JSON_FILE)) {
    try {
      const pkg = JSON.parse(fs.readFileSync(PACKAGE_JSON_FILE, "utf-8"));
      if (pkg.version) return pkg.version;
    } catch (_) {}
  }
  return "2.3.1";
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
  const localVersion = getLocalVersion();
  const cleanLocal = localVersion.replace(/^v/i, "").trim();

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

  const rawLatestVersion = latestRelease.tag_name || "";
  const cleanLatest = rawLatestVersion.replace(/^v/i, "").trim();

  console.log(`-> Version installée : ${cleanLocal}`);
  console.log(`-> Dernière version disponible sur GitHub : ${cleanLatest} (${rawLatestVersion})`);

  if (!isNewerVersion(cleanLatest, cleanLocal)) {
    console.log("\n[OK] Vous possédez déjà la dernière version disponible ! Aucune mise à jour requise.");
    process.exit(0);
  }

  // 3. DOWNLOAD THE RELEASE ZIP
  console.log(`\n[3/6] 📥 Téléchargement de la nouvelle version (${rawLatestVersion})...`);
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

    // Determine top-level source directory in the extracted ZIP
    let sourceDir = extractPath;
    if (!fs.existsSync(path.join(extractPath, "VERSION")) && !fs.existsSync(path.join(extractPath, "package.json"))) {
      const dirs = fs.readdirSync(extractPath).filter(f => fs.statSync(path.join(extractPath, f)).isDirectory());
      if (dirs.length > 0) {
        sourceDir = path.join(extractPath, dirs[0]);
      }
    }

    // Recursive copier that ignores user data, config files, node_modules, git configs
    function copyRecursive(src, dest) {
      const exists = fs.existsSync(src);
      const stats = exists && fs.statSync(src);
      const isDirectory = exists && stats.isDirectory();

      if (isDirectory) {
        const relativePath = path.relative(sourceDir, src);
        if (relativePath === "node_modules" || relativePath === ".git" || relativePath === "backups") {
          return;
        }
        
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

    // Update VERSION file explicitly with the clean release tag
    try {
      fs.writeFileSync(VERSION_FILE, cleanLatest + "\n", "utf-8");
      console.log(`[OK] Fichier VERSION mis à jour : ${cleanLatest}`);

      // Sync package.json if present
      if (fs.existsSync(PACKAGE_JSON_FILE)) {
        const pkg = JSON.parse(fs.readFileSync(PACKAGE_JSON_FILE, "utf-8"));
        pkg.version = cleanLatest;
        fs.writeFileSync(PACKAGE_JSON_FILE, JSON.stringify(pkg, null, 2) + "\n", "utf-8");
        console.log(`[OK] Fichier package.json mis à jour : ${cleanLatest}`);
      }
    } catch (vErr) {
      console.warn("⚠️ Ne peut pas mettre à jour le fichier VERSION/package.json :", vErr.message);
    }
  } catch (err) {
    console.error("⚠️ Échec lors du remplacement sélectif des fichiers.");
    console.error(err.message);
    console.log("\nTentative de restauration de l'index...");
    process.exit(1);
  }

  // 5. DEPENDENCIES REINSTALLATION & COMPILATION
  console.log("\n[5/6] 📦 Vérification des dépendances et de la compilation...");
  try {
    console.log("   Exécution de npm install pour garantir les dépendances système...");
    execSync("npm install --no-audit --no-fund", { stdio: "inherit", cwd: process.cwd() });

    const hasDist = fs.existsSync(path.join(process.cwd(), "dist", "server.cjs"));
    if (!hasDist) {
      console.log("   Exécution de npm run build...");
      execSync("npm run build", { stdio: "inherit", cwd: process.cwd() });
      console.log("[OK] Compilation effectuée avec succès.");
    } else {
      console.log("[OK] Application pré-compilée prête à exécuter.");
    }
  } catch (err) {
    console.warn("⚠️ Note lors de l'installation des dépendances/compilation :", err.message);
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
  console.log(` 🎉 MISE À JOUR TERMINÉE AVEC SUCCÈS ! VERSION INSTALLÉE : ${cleanLatest}`);
  console.log("======================================================================");
  console.log(" Vous pouvez maintenant démarrer l'application via start.bat en toute sécurité.");
  console.log("");
}

startUpdate().catch((err) => {
  console.error("Erreur générale inattendue durant la mise à jour :", err);
  process.exit(1);
});
