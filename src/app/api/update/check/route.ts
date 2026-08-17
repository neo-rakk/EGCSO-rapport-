import { NextResponse } from 'next/server';
import https from 'https';
import fs from 'fs';
import path from 'path';
import { getSettings } from '@/lib/storage';

function fetchUrl(url: string, headers: Record<string, string> = {}): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const options: https.RequestOptions = {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) EGCSO-Rapport-Updater',
        Accept: 'application/vnd.github.v3+json',
        ...headers,
      },
    };
    if (process.env.GITHUB_TOKEN) {
      options.headers!['Authorization'] = `token ${process.env.GITHUB_TOKEN}`;
    }

    https
      .get(url, options, (res) => {
        if (res.statusCode === 301 || res.statusCode === 302) {
          const redirectUrl = res.headers.location || '';
          fetchUrl(redirectUrl, headers).then(resolve).catch(reject);
          return;
        }
        if (res.statusCode !== 200) {
          reject(new Error(`HTTP ${res.statusCode}`));
          return;
        }
        const chunks: Buffer[] = [];
        res.on('data', (chunk) => chunks.push(chunk));
        res.on('end', () => resolve(Buffer.concat(chunks)));
      })
      .on('error', reject);
  });
}

function isNewerVersion(latest: string, current: string): boolean {
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

function getLocalVersion(): string {
  const versionFile = path.resolve(process.cwd(), 'VERSION');
  if (fs.existsSync(versionFile)) {
    const content = fs.readFileSync(versionFile, 'utf-8').trim();
    if (content) return content;
  }
  try {
    const pkg = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), 'package.json'), 'utf-8'));
    if (pkg.version) return pkg.version;
  } catch {
    // ignore
  }
  return '2.3.1';
}

export async function GET() {
  try {
    const settings = getSettings();
    const localVersion = getLocalVersion();
    const cleanLocal = localVersion.replace(/^v/i, '').trim();

    // Determine repo
    let repoOwner = 'neo-rakk';
    let repoName = 'EGCSO-rapport-';
    if (settings.githubRepo) {
      const cleanRepo = settings.githubRepo.trim().replace(/\/+$/, '');
      const parts = cleanRepo.split('/');
      if (parts.length === 2) {
        repoOwner = parts[0].trim();
        repoName = parts[1].trim();
      }
    }

    const apiUrl = `https://api.github.com/repos/${repoOwner}/${repoName}/releases/latest`;

    try {
      const responseBuffer = await fetchUrl(apiUrl);
      const release = JSON.parse(responseBuffer.toString('utf-8'));

      const rawLatestVersion = release.tag_name || '';
      const cleanLatest = rawLatestVersion.replace(/^v/i, '').trim();

      const updateAvailable = isNewerVersion(cleanLatest, cleanLocal);

      return NextResponse.json({
        currentVersion: cleanLocal,
        latestVersion: cleanLatest,
        updateAvailable,
        githubRepo: `${repoOwner}/${repoName}`,
        releaseNotes: release.body || '',
        publishedAt: release.published_at || '',
        releaseUrl: release.html_url || '',
      });
    } catch (err: any) {
      return NextResponse.json({
        currentVersion: cleanLocal,
        latestVersion: cleanLocal,
        updateAvailable: false,
        githubRepo: `${repoOwner}/${repoName}`,
        error: `Impossible de contacter l'API GitHub : ${err.message}. Le serveur doit avoir accès à Internet pour vérifier les mises à jour.`,
      });
    }
  } catch (err: any) {
    return NextResponse.json({ error: 'Erreur interne : ' + err.message }, { status: 500 });
  }
}
