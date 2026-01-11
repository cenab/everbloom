import { existsSync } from 'node:fs';
import { cp, mkdir, readdir } from 'node:fs/promises';
import path from 'node:path';

const projectRoot = process.cwd();
const targetDir = path.join(projectRoot, 'netlify', 'functions');
const ssrEntryNames = ['entry', 'ssr'];
const sourceDirs = [
  path.join(projectRoot, '.netlify', 'v1', 'functions'),
  path.join(projectRoot, 'dist', '.netlify', 'functions'),
  path.join(projectRoot, 'dist', '.netlify', 'functions-internal'),
  path.join(projectRoot, '.netlify', 'functions'),
  path.join(projectRoot, '.netlify', 'functions-internal'),
];

const hasEntryFile = async (dir) => {
  try {
    const entries = await readdir(dir, { withFileTypes: true });
    return entries.some((entry) => {
      if (entry.isFile()) {
        return ssrEntryNames.some(
          (name) => entry.name === name || entry.name.startsWith(`${name}.`),
        );
      }
      if (entry.isDirectory()) {
        return ssrEntryNames.includes(entry.name);
      }
      return false;
    });
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

  for (const dir of sourceDirs) {
    if (!existsSync(dir)) {
      continue;
    }
    try {
      const entries = await readdir(dir);
      console.error(`[sync-ssr-function] Checked ${dir}: ${entries.join(', ') || 'empty'}`);
    } catch {
      console.error(`[sync-ssr-function] Checked ${dir}: unable to read directory.`);
    }
  }
  console.error('[sync-ssr-function] SSR function entry not found in build output.');
  process.exit(1);
};

await sync();
