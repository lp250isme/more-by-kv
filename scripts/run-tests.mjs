// JSX tests are bundled with the esbuild already used to build the package,
// then executed by Node's built-in test runner. No extra test framework.
import { build } from 'esbuild';
import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
// Keep the bundle inside the package so Node can resolve react / react-dom
// from this repo's node_modules. node_modules is gitignored.
const dir = join(root, 'node_modules', '.cache', 'more-by-kv');
await mkdir(dir, { recursive: true });
const outfile = join(dir, 'more-by-kv.test.mjs');

await build({
    absWorkingDir: root,
    entryPoints: ['test/more-by-kv.test.jsx'],
    bundle: true,
    platform: 'node',
    format: 'esm',
    outfile,
    jsx: 'automatic',
    sourcemap: 'inline',
    sourcesContent: true,
    external: ['react', 'react-dom', 'react-dom/server', 'react/jsx-runtime'],
});

const child = spawn(
    process.execPath,
    ['--enable-source-maps', '--test', outfile],
    { stdio: 'inherit', cwd: root }
);

const code = await new Promise((resolve, reject) => {
    child.on('error', reject);
    child.on('exit', resolve);
});

process.exit(code ?? 1);
