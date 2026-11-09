import { spawn } from 'node:child_process';
import { mkdtemp, mkdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import electron from 'electron';

const root = fileURLToPath(new URL('../', import.meta.url));
const temporaryRoot = resolve(tmpdir());
const userData = await mkdtemp(join(temporaryRoot, 'warehouse-desktop-'));
const qa = join(root, '.local', 'qa');
await mkdir(qa, { recursive: true });
const env = { ...process.env };
delete env.ELECTRON_RUN_AS_NODE;
delete env.WAREHOUSE_DEV_SERVER_URL;

function run(phase) {
  return new Promise((resolveRun, reject) => {
    const child = spawn(electron, [join(root, 'scripts', 'desktop', 'runner.mjs'), userData, phase, qa],
      { cwd: root, env, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
    let output = '';
    child.stdout.on('data', data => { output += data; });
    child.stderr.on('data', data => { output += data; });
    const timeout = setTimeout(() => child.kill(), 45000);
    child.on('error', error => { clearTimeout(timeout); reject(error); });
    child.on('exit', code => {
      clearTimeout(timeout);
      if (code === 0 && output.includes(`DESKTOP_OK:${phase}`)) resolveRun();
      else reject(new Error(`Desktop phase ${phase} failed (${code}):\n${output.slice(-6000)}`));
    });
  });
}

try {
  await run('first');
  await run('restart');
  await run('startup');
  console.log('Desktop smoke passed: production startup, routes, themes, SQLite restart, sandbox and compact navigation.');
} finally {
  // Only remove the exact temporary directory this script created.
  if (!resolve(userData).startsWith(temporaryRoot + sep)) throw new Error('Unsafe temporary directory');
  await rm(userData, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
}
