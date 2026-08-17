import { NextRequest, NextResponse } from 'next/server';
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';

export async function POST(req: NextRequest) {
  try {
    const updateScript = path.resolve(process.cwd(), 'update.mjs');

    if (!fs.existsSync(updateScript)) {
      return NextResponse.json(
        { error: "Le script de mise à jour (update.mjs) est introuvable. Vérifiez que le fichier est présent à la racine du projet." },
        { status: 400 }
      );
    }

    // Create lock file to signal update in progress
    const lockFile = path.resolve(process.cwd(), 'update_in_progress.lock');
    fs.writeFileSync(lockFile, new Date().toISOString(), 'utf-8');

    // Spawn the update script in detached mode (does not block this process)
    const child = spawn(
      process.execPath,
      [updateScript],
      {
        cwd: process.cwd(),
        detached: true,
        stdio: 'ignore',
        env: { ...process.env },
      }
    );

    // Detach child so it continues running after this process exits
    child.unref();

    return NextResponse.json({
      success: true,
      message: 'Mise à jour lancée en arrière-plan. Le serveur va redémarrer automatiquement une fois l\'installation terminée.',
    });
  } catch (err: any) {
    // Clean up lock on error
    try {
      const lockFile = path.resolve(process.cwd(), 'update_in_progress.lock');
      if (fs.existsSync(lockFile)) fs.unlinkSync(lockFile);
    } catch {
      // ignore
    }
    return NextResponse.json({ error: "Erreur lors du lancement de la mise à jour : " + err.message }, { status: 500 });
  }
}
