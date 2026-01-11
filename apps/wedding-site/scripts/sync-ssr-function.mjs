import { existsSync } from 'node:fs';
import { cp, mkdir, readdir, rm } from 'node:fs/promises';
import path from 'node:path';

const projectRoot = process.cwd();
const targetDir = path.join(projectRoot, 'netlify', 'functions');
const ssrEntryNames = ['ssr', 'entry'];
const sourceDirs = [
  path.join(projectRoot, '.netlify', 'v1', 'functions'),
  path.join(projectRoot, 'dist', '.netlify', 'functions'),
  path.join(projectRoot, 'dist', '.netlify', 'functions-internal'),
  path.join(projectRoot, '.netlify', 'functions'),
  path.join(projectRoot, '.netlify', 'functions-internal'),
];

const getEntryInfo = async (dir) => {
  try {
    const entries = await readdir(dir, { withFileTypes: true });
    for (const name of ssrEntryNames) {
      const directoryMatch = entries.find((entry) => entry.isDirectory() && entry.name === name);
      if (directoryMatch) {
        return { name, path: path.join(dir, name), isDirectory: true };
      }
      const fileMatch = entries.find(
        (entry) =>
          entry.isFile() && (entry.name === name || entry.name.startsWith(`${name}.`)),
      );
      if (fileMatch) {
        return { name: fileMatch.name, path: path.join(dir, fileMatch.name), isDirectory: false };
      }
    }
    return null;
  } catch {
    return null;
  }
};

const cleanupTargetEntries = async () => {
  if (!existsSync(targetDir)) {
    return;
  }
  try {
    const entries = await readdir(targetDir, { withFileTypes: true });
    await Promise.all(
      entries
        .filter(
          (entry) =>
            ssrEntryNames.includes(entry.name) ||
            ssrEntryNames.some((name) => entry.name.startsWith(`${name}.`)),
        )
        .map((entry) => rm(path.join(targetDir, entry.name), { recursive: true, force: true })),
    );
  } catch {
    // Best effort cleanup; sync will still attempt to copy.
  }
};

const sync = async () => {
  await mkdir(targetDir, { recursive: true });

  for (const dir of sourceDirs) {
    if (!existsSync(dir)) {
      continue;
    }
    const entryInfo = await getEntryInfo(dir);
    if (!entryInfo) {
      continue;
    }
    await cleanupTargetEntries();
    const targetPath = path.join(targetDir, entryInfo.name);
    await cp(entryInfo.path, targetPath, {
      recursive: entryInfo.isDirectory,
      force: true,
      dereference: true,
    });
    console.log(
      `[sync-ssr-function] Copied SSR function assets from ${entryInfo.path} to ${targetPath}`,
    );
    return;
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
