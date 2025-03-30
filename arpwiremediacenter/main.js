const { app, BrowserWindow } = require("electron");
const path = require("path");

function createWindow() {
    const win = new BrowserWindow({
        width: 800,
        height: 600,
        frame: true, // Custom window frame
        transparent: false, // Disable transparency for now
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
        },
    });


    win.loadFile(path.join(__dirname, "build", "index.html")).then(() => {
        win.show();
    });
}

app.whenReady().then(createWindow);



