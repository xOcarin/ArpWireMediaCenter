const { app, BrowserWindow, ipcMain, dialog } = require("electron");
const path = require("path");
const fs = require('fs');

try {
    require("electron-reloader")(module);
} catch (err) {
    console.log("Live reload not available", err);
}

function createWindow() {
    const win = new BrowserWindow({
        width: 928,
        height: 274,
        frame: false, // Removes default window frame
        transparent: true, // Allows custom styling
        resizable: false, // Optional: Prevent resizing
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false, // should be false for security
        },
        roundedCorners: true,
    });

    const startUrl = process.env.ELECTRON_START_URL || `file://${path.join(__dirname, 'build', 'index.html')}`;
    win.loadURL(startUrl);

    win.setAlwaysOnTop(true,"screen");
    // Handle minimize and close events
    // ipcMain.on("minimize-window", () => win.minimize());
    // ipcMain.on("close-window", () => win.close());

    // Handle folder selection from renderer
    ipcMain.handle('dialog:openDirectory', async () => {
        const result = await dialog.showOpenDialog(win, {
            properties: ['openDirectory']
        });
        if (!result.canceled && result.filePaths.length > 0) {
            return result.filePaths[0];
        }
        return null;
    });

    ipcMain.handle('get-media-files', async (event, folderPath) => {
        const files = fs.readdirSync(folderPath)
            .filter(file => /\.(mp3|wav|mp4)$/i.test(file))
            .map(file => {
                const absPath = path.join(folderPath, file);
                return {
                    name: file,
                    absPath, // for Howler
                    fileUrl: 'file://' + absPath.replace(/\\/g, '/'), // for <audio>/<video>
                    type: file.endsWith('.mp4') ? 'video/mp4' : 'audio/mpeg',
                };
            });
        return files;
    });

    ipcMain.handle('get-music-path', () => {
        return app.getPath('music');
    });
}

app.whenReady().then(createWindow);
