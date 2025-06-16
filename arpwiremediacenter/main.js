const { app, BrowserWindow, ipcMain, dialog } = require("electron");
const path = require("path");
const fs = require('fs');
const isDev = require('electron-is-dev');

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

    const startUrl = isDev 
        ? 'http://localhost:3000'
        : `file://${path.join(__dirname, 'build', 'index.html')}`;
    win.loadURL(startUrl);

    // Handle minimize and close events
    ipcMain.on("minimize-window", () => win.minimize());
    ipcMain.on("close-window", () => win.close());

    // Handle folder selection from renderer
    ipcMain.handle('dialog:openDirectory', async () => {
        const result = await dialog.showOpenDialog(win, {
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
