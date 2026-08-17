import fs from 'fs';
import path from 'path';

const newVersion = process.argv[2];

if (!newVersion) {
  console.error('Please specify a version. Example: node scripts/bump-version.mjs 2.4.0');
  process.exit(1);
}

const cleanVersion = newVersion.replace(/^v/i, '').trim();

if (!/^\d+\.\d+\.\d+(-[a-zA-Z0-9.]+)?$/.test(cleanVersion)) {
  console.error(`Invalid version format: "${newVersion}". Expected: X.Y.Z or X.Y.Z-beta`);
  process.exit(1);
}

const versionFilePath = path.resolve(process.cwd(), 'VERSION');
const packageJsonPath = path.resolve(process.cwd(), 'package.json');

try {
  fs.writeFileSync(versionFilePath, cleanVersion + '\n', 'utf-8');
  console.log(`VERSION file updated: ${cleanVersion}`);

  if (fs.existsSync(packageJsonPath)) {
    const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
    pkg.version = cleanVersion;
    fs.writeFileSync(packageJsonPath, JSON.stringify(pkg, null, 2) + '\n', 'utf-8');
    console.log(`package.json updated: ${cleanVersion}`);
  }

  console.log(`Version bumped to ${cleanVersion} !`);
} catch (err) {
  console.error('Failed to update version:', err.message);
  process.exit(1);
}
