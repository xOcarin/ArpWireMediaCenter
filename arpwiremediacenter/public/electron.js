const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');

app.setName('ArpWire Media Center');

try {
    require("electron-reloader")(module);
} catch (err) {
    console.log("Live reload not available", err);
}

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 928,
    height: 375,
    frame: false,
    transparent: true,
    resizable: false,
    title: 'ArpWire Media Center',
    icon: path.join(__dirname, 'media player components/ico.png'),
    webPreferences: {
      preload: path.join(__dirname, '../preload.js'),
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  mainWindow.loadURL(`file://${path.join(__dirname, '../build/index.html')}`);

  // Handle minimize and close events
  ipcMain.on("minimize-window", () => mainWindow.minimize());
  ipcMain.on("close-window", () => mainWindow.close());

  // Handle window resizing for drawer
  ipcMain.on("expand-window", () => mainWindow.setSize(928, 574));
  ipcMain.on("shrink-window", () => mainWindow.setSize(928, 375));

  // Handle folder selection from renderer
  ipcMain.handle('dialog:openDirectory', async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ['openDirectory', 'openFile'],
      filters: [
        { name: 'Media Files', extensions: ['mp3', 'wav', 'mp4'] }
      ]
    });
    if (!result.canceled && result.filePaths.length > 0) {
      // Store the selected path
      const selectedPath = result.filePaths[0];
      app.setPath('userData', selectedPath);
      return selectedPath;
    }
    return null;
  });

  ipcMain.handle('get-media-files', async (event, folderPath) => {
    try {
      const files = fs.readdirSync(folderPath)
        .map(file => {
          const absPath = path.join(folderPath, file);
          const stats = fs.statSync(absPath);
          return {
            name: file,
            path: absPath,
            isDirectory: stats.isDirectory(),
            type: file.toLowerCase().endsWith('.mp4') ? 'video/mp4' : 'audio/mpeg'
          };
        })
        .filter(file => {
          if (file.isDirectory) return false; // Don't include directories
          const ext = file.name.toLowerCase().split('.').pop();
          return ['mp3', 'wav', 'mp4'].includes(ext);
        });
      console.log('Found files:', files); // Debug log
      return files;
    } catch (error) {
      console.error('Error reading directory:', error);
      return [];
    }
  });

  ipcMain.handle('get-music-path', () => {
    // Try to get the stored path first
    const storedPath = app.getPath('userData');
    if (storedPath && fs.existsSync(storedPath)) {
      return storedPath;
    }
    // Fallback to default music path
    return app.getPath('music');
  });
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
}); 