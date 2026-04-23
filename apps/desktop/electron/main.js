const fs = require('fs');
const path = require('path');
const { app, BrowserWindow, dialog, ipcMain, shell } = require('electron');

const DEFAULT_URL = 'http://localhost:3080';
const SETTINGS_FILE = 'desktop-settings.json';

let mainWindow = null;

const getStartUrl = () => process.env.SECURECHAT_DESKTOP_URL || DEFAULT_URL;

const settingsPath = () => path.join(app.getPath('userData'), SETTINGS_FILE);

const readSettings = () => {
  try {
    const content = fs.readFileSync(settingsPath(), 'utf8');
    return JSON.parse(content);
  } catch (_error) {
    return {};
  }
};

const writeSettings = (settings) => {
  fs.writeFileSync(settingsPath(), JSON.stringify(settings, null, 2), 'utf8');
};

const ensureInsideFolder = (rootFolder, targetPath) => {
  if (!rootFolder) {
    throw new Error('No local workspace selected.');
  }
  const root = path.resolve(rootFolder);
  const target = path.resolve(targetPath);
  const relative = path.relative(root, target);
  if (relative.startsWith('..') || path.isAbsolute(relative)) {
    throw new Error('Target path is outside the selected workspace.');
  }
};

const workspaceRoot = () => {
  const settings = readSettings();
  return settings.workspaceRoot || null;
};

const createWindow = () => {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 920,
    minWidth: 1024,
    minHeight: 720,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  mainWindow.loadURL(getStartUrl());

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });
};

const registerIpcHandlers = () => {
  ipcMain.handle('desktop:workspace:get', () => workspaceRoot());

  ipcMain.handle('desktop:workspace:choose', async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openDirectory', 'createDirectory'],
      title: 'Select SecureChat local workspace folder',
    });
    if (result.canceled || result.filePaths.length === 0) {
      return null;
    }
    const selected = result.filePaths[0];
    const settings = readSettings();
    settings.workspaceRoot = selected;
    writeSettings(settings);
    return selected;
  });

  ipcMain.handle('desktop:workspace:list', (_event, relativePath = '.') => {
    const root = workspaceRoot();
    const abs = path.join(root || '', relativePath);
    ensureInsideFolder(root, abs);
    return fs.readdirSync(abs, { withFileTypes: true }).map((entry) => ({
      name: entry.name,
      isDirectory: entry.isDirectory(),
      isFile: entry.isFile(),
    }));
  });

  ipcMain.handle('desktop:workspace:readText', (_event, relativePath) => {
    const root = workspaceRoot();
    const abs = path.join(root || '', relativePath);
    ensureInsideFolder(root, abs);
    return fs.readFileSync(abs, 'utf8');
  });

  ipcMain.handle('desktop:workspace:writeText', (_event, relativePath, content) => {
    const root = workspaceRoot();
    const abs = path.join(root || '', relativePath);
    ensureInsideFolder(root, abs);
    fs.mkdirSync(path.dirname(abs), { recursive: true });
    fs.writeFileSync(abs, content, 'utf8');
    return true;
  });
};

app.whenReady().then(() => {
  registerIpcHandlers();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
