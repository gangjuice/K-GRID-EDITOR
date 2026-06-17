const { app, BrowserWindow } = require("electron");
const express = require("express");
const path = require("path");

const server = express();

server.use(express.static(__dirname));

server.listen(3000, () => {
    console.log("Server started");
});

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

win.loadURL("http://localhost:8000/index.html");
}

app.whenReady().then(() => {
    createWindow();
});

app.on("window-all-closed", () => {
    if (process.platform !== "darwin") {
        app.quit();
    }
});
