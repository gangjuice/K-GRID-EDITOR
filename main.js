const { app, BrowserWindow } = require("electron");

function createWindow() {

    const win = new BrowserWindow({
        width: 1800,
        height: 1000,

        webPreferences: {
            preload: __dirname + "/preload.js",
            contextIsolation: true,
            nodeIntegration: false
        }
    });

    win.loadFile("index.html");
}

app.whenReady().then(() => {
    createWindow();
});

app.on("window-all-closed", () => {
    if (process.platform !== "darwin") {
        app.quit();
    }
});
