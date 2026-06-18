const { app, BrowserWindow } = require("electron");
const express = require("express");
const path = require("path");
const fs = require("fs");

const server = express();
let dataDir = null;

server.use(express.static(__dirname));
server.use(express.json());

// 데이터 자동 저장 API
server.post("/api/save-data", (req, res) => {
    try {
        const { projectName, parcelId, data } = req.body;
        if (!projectName || !parcelId || !dataDir) {
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

// 프로젝트 데이터 로드 API
server.get("/api/load-data/:projectName", (req, res) => {
    try {
        if (!dataDir) return res.json({});
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

// 글로벌 수요전력 설정 로드 API
server.get("/api/load-rate-settings", (req, res) => {
    try {
        if (!dataDir) return res.json({ current: {}, presets: {} });
        const filePath = path.join(dataDir, "_rate_settings.json");
        if (!fs.existsSync(filePath)) return res.json({ current: {}, presets: {} });
        res.json(JSON.parse(fs.readFileSync(filePath, "utf-8")));
    } catch (err) {
        res.json({ current: {}, presets: {} });
    }
});

// 글로벌 수요전력 설정 저장 API
server.post("/api/save-rate-settings", (req, res) => {
    try {
        if (!dataDir) return res.status(400).json({ error: "초기화 중" });
        const filePath = path.join(dataDir, "_rate_settings.json");
        fs.writeFileSync(filePath, JSON.stringify(req.body, null, 2), "utf-8");
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 프로젝트 데이터 초기화 API
server.post("/api/clear-data/:projectName", (req, res) => {
    try {
        if (!dataDir) return res.status(400).json({ error: "초기화 중" });
        const filePath = path.join(dataDir, `${req.params.projectName}.json`);
        fs.writeFileSync(filePath, JSON.stringify({}, null, 2), "utf-8");
        res.json({ success: true, message: "데이터 초기화 완료" });
    } catch (err) {
        console.error("데이터 초기화 에러:", err);
        res.status(500).json({ error: err.message });
    }
});

function createWindow() {
    const win = new BrowserWindow({
        width: 1800,
        height: 1000,
        webPreferences: {
            contextIsolation: false,
            nodeIntegration: false,
            webSecurity: false
        }
    });

    win.loadURL("http://localhost:8000/index.html");
    win.setMenuBarVisibility(false);
}

app.whenReady().then(() => {
    // userData: 앱 종료 후에도 유지되는 경로 (C:\Users\...\AppData\Roaming\K-GRID EDITOR\)
    dataDir = path.join(app.getPath('userData'), 'data');
    if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
    }

    server.listen(8000, () => {
        console.log("Server started on port 8000");
    });

    createWindow();
});

app.on("window-all-closed", () => {
    if (process.platform !== "darwin") {
        app.quit();
    }
});
