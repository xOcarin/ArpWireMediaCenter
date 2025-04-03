const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("path");

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
            nodeIntegration: true,
            contextIsolation: true,
        },
        roundedCorners: true,
    });

    const isDev = !app.isPackaged;

    if (isDev) {
        win.loadURL("http://localhost:3000"); // React dev server
    } else {
        win.loadURL(`file://${path.join(__dirname, 'build', 'index.html')}`);
    }



    win.setAlwaysOnTop(true,"screen");
    // Handle minimize and close events
    ipcMain.on("minimize-window", () => win.minimize());
    ipcMain.on("close-window", () => win.close());
}

app.whenReady().then(createWindow);
