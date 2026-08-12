import fs from "fs";
import path from "path";

const newVersion = process.argv[2];

if (!newVersion) {
  console.error("❌ Veuillez spécifier une version. Exemple: npm run release-version 2.4.0");
  process.exit(1);
}

const cleanVersion = newVersion.replace(/^v/i, "").trim();

if (!/^\d+\.\d+\.\d+(-[a-zA-Z0-9.]+)?$/.test(cleanVersion)) {
  console.error(`❌ Format de version invalide : "${newVersion}". Attendu : X.Y.Z ou X.Y.Z-beta`);
  process.exit(1);
}

const versionFilePath = path.resolve(process.cwd(), "VERSION");
const packageJsonPath = path.resolve(process.cwd(), "package.json");

try {
  // Update VERSION file
  fs.writeFileSync(versionFilePath, cleanVersion + "\n", "utf-8");
  console.log(`✅ Fichier VERSION mis à jour : ${cleanVersion}`);

  // Update package.json
  if (fs.existsSync(packageJsonPath)) {
    const pkg = JSON.parse(fs.readFileSync(packageJsonPath, "utf-8"));
    pkg.version = cleanVersion;
    fs.writeFileSync(packageJsonPath, JSON.stringify(pkg, null, 2) + "\n", "utf-8");
    console.log(`✅ Fichier package.json mis à jour : ${cleanVersion}`);
  }

  console.log(`🎉 Version bousculée avec succès à ${cleanVersion} !`);
} catch (err) {
  console.error("❌ Échec de la mise à jour de la version :", err.message);
  process.exit(1);
}
