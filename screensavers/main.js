const { app, BrowserWindow, screen, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');

// Windows passes screensaver args: /s (start), /c (configure), /p <hwnd> (preview)
function detectMode(argv) {
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i].replace(/^-/, '/').toLowerCase();
    if (a === '/s') return 'screensaver';
    if (a.startsWith('/c')) return 'configure';
    if (a.startsWith('/p')) return 'preview';
  }
  return 'configure';
}

const mode = detectMode(process.argv.slice(1));

const LOG = path.join(process.env.LOCALAPPDATA || process.env.APPDATA || '.', 'Screensavers', 'ss-debug.log');
function log(msg) {
  try { fs.appendFileSync(LOG, `[${new Date().toISOString()}] ${msg}\n`); } catch(e) {}
}
log(`--- startup --- mode=${mode} argv=${JSON.stringify(process.argv)}`);

const IMAGE_EXTS = new Set(['.jpg','.jpeg','.png','.gif','.webp','.bmp','.tiff','.tif']);

app.whenReady().then(() => {
  log('app ready');
  ipcMain.handle('select-folder', async () => {
    const win = BrowserWindow.getFocusedWindow();
    const result = await dialog.showOpenDialog(win || null, {
      properties: ['openDirectory'],
      title: 'Select Photo Folder for Desktop Havoc',
    });
    return result.canceled ? null : result.filePaths[0];
  });

  ipcMain.handle('list-images', async (_e, folder) => {
    if (!folder) return [];
    const results = [];
    function scan(dir) {
      let entries;
      try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch (e) { return; }
      for (const entry of entries) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          scan(full);
        } else if (IMAGE_EXTS.has(path.extname(entry.name).toLowerCase())) {
          results.push('file:///' + full.replace(/\\/g, '/'));
        }
      }
    }
    scan(folder);
    // Shuffle so the screensaver cycles through images in random order
    for (let i = results.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [results[i], results[j]] = [results[j], results[i]];
    }
    return results;
  });

  log(`launching mode: ${mode}`);
  if (mode === 'screensaver') {
    startScreensaver();
  } else if (mode === 'preview') {
    // Can't embed into Windows preview HWND from Electron — just quit silently
    app.quit();
  } else {
    openConfigure();
  }
});

app.on('window-all-closed', () => app.quit());

function startScreensaver() {
  const displays = screen.getAllDisplays();
  const wins = [];

  for (const display of displays) {
    log(`creating window for display ${display.id} bounds=${JSON.stringify(display.bounds)}`);
    const win = new BrowserWindow({
      x: display.bounds.x,
      y: display.bounds.y,
      width: display.bounds.width,
      height: display.bounds.height,
      frame: false,
      fullscreen: true,
      alwaysOnTop: true,
      skipTaskbar: true,
      show: false,
      backgroundColor: '#000000',
      webPreferences: {
        preload: path.join(__dirname, 'preload.js'),
        nodeIntegration: false,
        contextIsolation: true,
      },
    });

    const htmlPath = path.join(__dirname, 'Screensavers.html');
    log(`loading file: ${htmlPath}`);
    win.loadFile(htmlPath, { query: { mode: 'screensaver' } });
    win.once('ready-to-show', () => { log('ready-to-show'); win.show(); });
    win.webContents.on('did-fail-load', (_e, code, desc) => log(`did-fail-load: ${code} ${desc}`));
    win.webContents.on('render-process-gone', (_e, details) => log(`render-process-gone: ${JSON.stringify(details)}`));

    // Exit on keydown (from renderer via preload)
    win.webContents.on('before-input-event', (_e, input) => {
      if (input.type === 'keyDown') quit();
    });

    wins.push(win);
  }

  // Exit on mouse click (sent from renderer) or keypress
  ipcMain.on('exit-screensaver', quit);

  function quit() {
    app.quit();
  }
}

function openConfigure() {
  const win = new BrowserWindow({
    width: 1100,
    height: 740,
    minWidth: 800,
    minHeight: 560,
    title: 'Screensavers — Control Panel',
    webPreferences: {
      preload: path.join(__dirname, 'preload-configure.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });
  win.loadFile(path.join(__dirname, 'Screensavers.html'));
  win.on('closed', () => app.quit());
}
