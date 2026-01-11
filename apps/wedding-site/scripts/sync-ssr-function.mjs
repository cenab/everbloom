import { existsSync } from 'node:fs';
import { cp, mkdir, readdir } from 'node:fs/promises';
import path from 'node:path';

const projectRoot = process.cwd();
const targetDir = path.join(projectRoot, 'netlify', 'functions');
const sourceDirs = [
  path.join(projectRoot, 'dist', '.netlify', 'functions'),
  path.join(projectRoot, 'dist', '.netlify', 'functions-internal'),
];

const hasEntryFile = async (dir) => {
  try {
    const files = await readdir(dir);
    return files.some((file) => file.startsWith('entry.'));
  } catch {
    return false;
  }
};

const sync = async () => {
  await mkdir(targetDir, { recursive: true });

  for (const dir of sourceDirs) {
    if (!existsSync(dir)) {
      continue;
    }
    if (await hasEntryFile(dir)) {
      await cp(dir, targetDir, { recursive: true, force: true });
      console.log(`[sync-ssr-function] Copied SSR function assets from ${dir}`);
      return;
    }
  }

  console.error('[sync-ssr-function] SSR function entry not found in build output.');
  process.exit(1);
};

await sync();
