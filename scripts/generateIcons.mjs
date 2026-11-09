import electron from 'electron';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const directory = new URL('../src/public/icons/', import.meta.url);
const sizes = [16, 24, 32, 48, 64, 128, 256, 512];

// ICO supports PNG payloads on all Windows versions supported by Electron.
function encodeIco(images) {
  const header = Buffer.alloc(6 + images.length * 16);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(images.length, 4);
  let offset = header.length;
  images.forEach(({ size, bytes }, index) => {
    const entry = 6 + index * 16;
    header[entry] = header[entry + 1] = size === 256 ? 0 : size;
    header.writeUInt16LE(1, entry + 4);
    header.writeUInt16LE(32, entry + 6);
    header.writeUInt32LE(bytes.length, entry + 8);
    header.writeUInt32LE(offset, entry + 12);
    offset += bytes.length;
  });
  return Buffer.concat([header, ...images.map(({ bytes }) => bytes)]);
}

if (!process.versions.electron) {
  const env = { ...process.env };
  delete env.ELECTRON_RUN_AS_NODE;
  const result = spawnSync(electron, [fileURLToPath(import.meta.url)], {
    cwd: root, env, stdio: 'inherit', windowsHide: true,
  });
  if (result.error) console.error(result.error.message);
  process.exitCode = result.status ?? 1;
} else {
  const { app, BrowserWindow } = electron;
  const runtime = fileURLToPath(new URL('../.local/icon-runtime/', import.meta.url));
  mkdirSync(runtime, { recursive: true });
  app.setPath('userData', runtime);
  // Register readiness without awaiting it at ESM module scope.
  app.whenReady().then(async () => {
    const window = new BrowserWindow({
      show: false,
      webPreferences: { sandbox: true, contextIsolation: true, nodeIntegration: false },
    });
    try {
      await window.loadURL('about:blank');
      const svg = readFileSync(new URL('app.svg', directory), 'utf8');
      const pngs = await window.webContents.executeJavaScript(`(async () => {
        const image = new Image();
        image.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(${JSON.stringify(svg)});
        await image.decode();
        return ${JSON.stringify(sizes)}.map(size => {
          const canvas = document.createElement('canvas');
          canvas.width = canvas.height = size;
          canvas.getContext('2d').drawImage(image, 0, 0, size, size);
          return canvas.toDataURL('image/png').split(',')[1];
        });
      })()`);
      const images = sizes.map((size, index) => ({ size, bytes: Buffer.from(pngs[index], 'base64') }));
      for (const image of images.filter(({ size }) => size >= 256)) {
        writeFileSync(new URL(`app-${image.size}.png`, directory), image.bytes);
      }
      writeFileSync(new URL('app.ico', directory), encodeIco(images.filter(({ size }) => size <= 256)));
      console.log('Generated app-256.png, app-512.png and app.ico from app.svg.');
    } catch (error) {
      console.error(error);
      process.exitCode = 1;
    } finally {
      window.destroy();
      app.quit();
    }
  }).catch(error => { console.error(error); app.exit(1); });
}
