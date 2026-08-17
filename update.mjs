import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import https from 'https';
import AdmZip from 'adm-zip';

// Ensure update_in_progress.lock is always deleted on exit
process.on('exit', () => {
  try {
    const lockFile = path.resolve(process.cwd(), 'update_in_progress.lock');
    if (fs.existsSync(lockFile)) {
      fs.unlinkSync(lockFile);
      console.log('Lock update_in_progress.lock released.');
    }
  } catch {
    // ignore
  }
});

const VERSION_FILE = path.resolve(process.cwd(), 'VERSION');
const PACKAGE_JSON_FILE = path.resolve(process.cwd(), 'package.json');
const SETTINGS_FILE = path.resolve(process.cwd(), 'config/settings.json');

// Default repo coordinates
let repoOwner = 'neo-rakk';
let repoName = 'EGCSO-rapport-';

// Get settings to locate storageRoot and custom repo
let storageRoot = 'C:\\EGCSO_Maintenance';
try {
  if (fs.existsSync(SETTINGS_FILE)) {
    const settings = JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf-8'));
    if (settings.storageRoot) storageRoot = settings.storageRoot;
    if (settings.githubRepo) {
      const cleanRepo = settings.githubRepo.trim().replace(/\/+$/, '');
      const parts = cleanRepo.split('/');
      if (parts.length === 2) {
        repoOwner = parts[0].trim();
        repoName = parts[1].trim();
      }
    }
  }
} catch {
  console.error('Cannot read settings, using defaults.');
}

function getResolvedStorageRoot() {
  if (process.platform === 'win32') {
    if (path.isAbsolute(storageRoot)) return storageRoot;
    return path.resolve(process.cwd(), storageRoot);
  } else {
    if (storageRoot.includes(':\\') || storageRoot.startsWith('C:')) {
      return path.resolve(process.cwd(), 'EGCSO_Maintenance');
    }
    return path.resolve(process.cwd(), storageRoot);
  }
}

const resolvedStorageRoot = getResolvedStorageRoot();

function fetchUrl(url, headers = {}) {
  return new Promise((resolve, reject) => {
    const options = {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) EGCSO-Rapport-Updater',
        'Accept': 'application/vnd.github.v3+json',
        ...headers,
      },
    };
    if (process.env.GITHUB_TOKEN) {
      options.headers['Authorization'] = `token ${process.env.GITHUB_TOKEN}`;
    }
    https.get(url, options, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        fetchUrl(res.headers.location, headers).then(resolve).catch(reject);
        return;
      }
      if (res.statusCode !== 200) {
        reject(new Error(`HTTP ${res.statusCode}`));
        return;
      }
      const chunks = [];
      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () => resolve(Buffer.concat(chunks)));
    }).on('error', reject);
  });
}

function isNewerVersion(latest, current) {
  try {
    const lParts = latest.replace(/[^0-9.]/g, '').split('.').map((n) => parseInt(n, 10) || 0);
    const cParts = current.replace(/[^0-9.]/g, '').split('.').map((n) => parseInt(n, 10) || 0);
    for (let i = 0; i < Math.max(lParts.length, cParts.length); i++) {
      const l = lParts[i] || 0;
      const c = cParts[i] || 0;
      if (l > c) return true;
      if (l < c) return false;
    }
  } catch {
    // ignore
  }
  return latest !== current;
}

function getLocalVersion() {
  if (fs.existsSync(VERSION_FILE)) {
    const content = fs.readFileSync(VERSION_FILE, 'utf-8').trim();
    if (content) return content;
  }
  try {
    const pkg = JSON.parse(fs.readFileSync(PACKAGE_JSON_FILE, 'utf-8'));
    if (pkg.version) return pkg.version;
  } catch {
    // ignore
  }
  return '2.3.1';
}

async function startUpdate() {
  console.log('======================================================================');
  console.log('             AUTOMATIC UPDATE - EGCSO RAPPORT                        ');
  console.log('======================================================================');
  console.log('');

  // 1. SAFE AUTOMATIC BACKUP
  console.log('[1/6] Creating security backup...');
  const backupsDir = path.resolve(process.cwd(), 'backups');
  if (!fs.existsSync(backupsDir)) {
    fs.mkdirSync(backupsDir, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupZipPath = path.join(backupsDir, `EGCSO_Backup_${timestamp}.zip`);

  try {
    const backupZip = new AdmZip();

    const dbFile = path.join(resolvedStorageRoot, 'index_db.json');
    if (fs.existsSync(dbFile)) backupZip.addLocalFile(dbFile, '');

    const reportsDir = path.join(resolvedStorageRoot, 'reports');
    if (fs.existsSync(reportsDir)) backupZip.addLocalFolder(reportsDir, 'reports');

    const configDir = path.resolve(process.cwd(), 'config');
    ['settings.json', 'unites.json', 'categories_pannes.json'].forEach((f) => {
      const p = path.join(configDir, f);
      if (fs.existsSync(p)) backupZip.addLocalFile(p, 'config');
    });

    backupZip.writeZip(backupZipPath);
    console.log(`[OK] Backup created: ${backupZipPath}`);
  } catch (err) {
    console.error('Backup failed. Update aborted for safety.');
    console.error(err.message);
    process.exit(1);
  }

  // 2. CHECK GITHUB FOR LATEST VERSION
  console.log('\n[2/6] Checking GitHub for latest version...');
  const localVersion = getLocalVersion();
  const cleanLocal = localVersion.replace(/^v/i, '').trim();

  const apiUrl = `https://api.github.com/repos/${repoOwner}/${repoName}/releases/latest`;
  let latestRelease;
  try {
    const responseBuffer = await fetchUrl(apiUrl);
    latestRelease = JSON.parse(responseBuffer.toString('utf-8'));
  } catch (err) {
    console.error('Cannot reach GitHub API.');
    console.error(err.message);
    process.exit(1);
  }

  const rawLatestVersion = latestRelease.tag_name || '';
  const cleanLatest = rawLatestVersion.replace(/^v/i, '').trim();

  console.log(`-> Installed version: ${cleanLocal}`);
  console.log(`-> Latest available: ${cleanLatest} (${rawLatestVersion})`);

  if (!isNewerVersion(cleanLatest, cleanLocal)) {
    console.log('\n[OK] Already up to date!');
    process.exit(0);
  }

  // 3. DOWNLOAD RELEASE ZIP
  console.log(`\n[3/6] Downloading ${rawLatestVersion}...`);
  let zipUrl = latestRelease.zipball_url;

  if (latestRelease.assets && Array.isArray(latestRelease.assets) && latestRelease.assets.length > 0) {
    const assetZip = latestRelease.assets.find((a) => a.name && a.name.endsWith('.zip'));
    if (assetZip && assetZip.browser_download_url) {
      zipUrl = assetZip.browser_download_url;
      console.log(`[OK] Pre-compiled pack selected: ${assetZip.name}`);
    }
  }

  const tmpDir = path.resolve(process.cwd(), '_update_tmp');
  if (fs.existsSync(tmpDir)) fs.rmSync(tmpDir, { recursive: true, force: true });
  fs.mkdirSync(tmpDir, { recursive: true });

  const zipPath = path.join(tmpDir, 'release.zip');
  try {
    const zipBuffer = await fetchUrl(zipUrl);
    fs.writeFileSync(zipPath, zipBuffer);
    console.log('[OK] Download complete.');
  } catch (err) {
    console.error('Download failed.');
    console.error(err.message);
    process.exit(1);
  }

  // 4. EXTRACTION AND SELECTIVE COPIES
  console.log('\n[4/6] Extracting and replacing files...');
  try {
    const zip = new AdmZip(zipPath);
    const extractPath = path.join(tmpDir, 'extracted');
    zip.extractAllTo(extractPath, true);

    let sourceDir = extractPath;
    if (!fs.existsSync(path.join(extractPath, 'VERSION')) && !fs.existsSync(path.join(extractPath, 'package.json'))) {
      const dirs = fs.readdirSync(extractPath).filter((f) => fs.statSync(path.join(extractPath, f)).isDirectory());
      if (dirs.length > 0) sourceDir = path.join(extractPath, dirs[0]);
    }

    function copyRecursive(src, dest) {
      const exists = fs.existsSync(src);
      const stats = exists && fs.statSync(src);
      const isDirectory = exists && stats.isDirectory();

      if (isDirectory) {
        const relativePath = path.relative(sourceDir, src);
        if (relativePath === 'node_modules' || relativePath === '.git' || relativePath === 'backups') return;
        if (path.resolve(dest) === path.resolve(resolvedStorageRoot)) {
          console.log(`   [Skipped] Storage: ${relativePath}`);
          return;
        }
        if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
        fs.readdirSync(src).forEach((child) => copyRecursive(path.join(src, child), path.join(dest, child)));
      } else {
        const relativePath = path.relative(sourceDir, src);
        if (
          relativePath === 'config/settings.json' ||
          relativePath === 'config/unites.json' ||
          relativePath === 'config/categories_pannes.json' ||
          relativePath === '.env'
        ) {
          console.log(`   [Preserved] User config: ${relativePath}`);
          return;
        }
        fs.copyFileSync(src, dest);
      }
    }

    copyRecursive(sourceDir, process.cwd());
    console.log('[OK] Files replaced.');

    try {
      fs.writeFileSync(VERSION_FILE, cleanLatest + '\n', 'utf-8');
      console.log(`[OK] VERSION updated: ${cleanLatest}`);
      if (fs.existsSync(PACKAGE_JSON_FILE)) {
        const pkg = JSON.parse(fs.readFileSync(PACKAGE_JSON_FILE, 'utf-8'));
        pkg.version = cleanLatest;
        fs.writeFileSync(PACKAGE_JSON_FILE, JSON.stringify(pkg, null, 2) + '\n', 'utf-8');
        console.log(`[OK] package.json updated: ${cleanLatest}`);
      }
    } catch (vErr) {
      console.warn('Warning: cannot update VERSION/package.json:', vErr.message);
    }
  } catch (err) {
    console.error('Extraction failed.');
    console.error(err.message);
    process.exit(1);
  }

  // 5. DEPENDENCIES REINSTALLATION
  console.log('\n[5/6] Verifying dependencies...');
  try {
    console.log('   Running npm install...');
    execSync('npm install --no-audit --no-fund', { stdio: 'inherit', cwd: process.cwd() });
    console.log('[OK] Dependencies verified.');
  } catch (err) {
    console.warn('Warning during dependency install:', err.message);
  }

  // 6. CLEAN UP + MARK REBUILD REQUIRED
  console.log('\n[6/6] Cleaning temporary files...');
  try {
    if (fs.existsSync(tmpDir)) fs.rmSync(tmpDir, { recursive: true, force: true });
    console.log('[OK] Cleanup done.');
  } catch {
    console.warn('Warning: cannot clean tmp directory.');
  }

  // Signal start.bat that a rebuild is needed
  try {
    fs.writeFileSync(path.resolve(process.cwd(), 'rebuild_required.flag'), '1', 'utf-8');
    console.log('[OK] Rebuild flag set. start.bat will recompile automatically.');
  } catch {
    console.warn('Warning: cannot create rebuild flag.');
  }

  console.log('\n======================================================================');
  console.log(` UPDATE COMPLETE - VERSION ${cleanLatest} INSTALLED`);
  console.log('======================================================================');
  console.log(' You can now restart the application via start.bat.');
  console.log('');
}

startUpdate().catch((err) => {
  console.error('Unexpected update error:', err);
  process.exit(1);
});
