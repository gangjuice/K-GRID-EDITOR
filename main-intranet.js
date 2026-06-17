const { app, BrowserWindow } = require("electron");
const express = require("express");
const path = require("path");
const fs = require("fs");

const server = express();
const dataDir = path.join(__dirname, "data");

if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir);
}

server.use(express.static(__dirname));
server.use(express.json());

server.post("/api/save-data", (req, res) => {
    try {
        const { projectName, parcelId, data } = req.body;
        if (!projectName || !parcelId) {
            return res.status(400).json({ error: "projectName과 parcelId 필수" });
        }
        const filePath = path.join(dataDir, `${projectName}.json`);
        let projectData = {};
        if (fs.existsSync(filePath)) {
            projectData = JSON.parse(fs.readFileSync(filePath, "utf-8"));
        }
        projectData[parcelId] = data;
        fs.writeFileSync(filePath, JSON.stringify(projectData, null, 2), "utf-8");
        res.json({ success: true, message: "데이터 저장 완료" });
    } catch (err) {
        console.error("데이터 저장 에러:", err);
        res.status(500).json({ error: err.message });
    }
});

server.get("/api/load-data/:projectName", (req, res) => {
    try {
        const filePath = path.join(dataDir, `${req.params.projectName}.json`);
        if (!fs.existsSync(filePath)) {
            return res.json({});
        }
        const data = JSON.parse(fs.readFileSync(filePath, "utf-8"));
        res.json(data);
    } catch (err) {
        console.error("데이터 로드 에러:", err);
        res.json({});
    }
});

server.post("/api/clear-data/:projectName", (req, res) => {
    try {
        const filePath = path.join(dataDir, `${req.params.projectName}.json`);
        fs.writeFileSync(filePath, JSON.stringify({}, null, 2), "utf-8");
        res.json({ success: true, message: "데이터 초기화 완료" });
    } catch (err) {
        console.error("데이터 초기화 에러:", err);
        res.status(500).json({ error: err.message });
    }
});

server.listen(8001, () => {
    console.log("Intranet server started on port 8001");
});

function createWindow() {
    const win = new BrowserWindow({
        width: 1800,
        height: 1000,
        webPreferences: {
            contextIsolation: false,
            nodeIntegration: false,
            devTools: false
        }
    });

    win.loadURL("http://localhost:8001/intranet.html");
    win.setMenuBarVisibility(false);
}

app.whenReady().then(() => {
    createWindow();
});

app.on("window-all-closed", () => {
    if (process.platform !== "darwin") {
        app.quit();
    }
});
