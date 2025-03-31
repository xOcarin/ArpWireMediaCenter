const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("path");

function createWindow() {
    const win = new BrowserWindow({
        width: 800,
        height: 600,
        frame: false, // Removes default window frame
        transparent: true, // Allows custom styling
        resizable: false, // Optional: Prevent resizing
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
        },
    });

    win.loadURL(`file://${path.join(__dirname, "build", "index.html")}`);

    // Handle minimize and close events
    ipcMain.on("minimize-window", () => win.minimize());
    ipcMain.on("close-window", () => win.close());
}

app.whenReady().then(createWindow);
