const { app, BrowserWindow } = require("electron");
const express = require("express");
const path = require("path");
const fs = require("fs");

const server = express();
const dataDir = path.join(__dirname, "data");

// data 폴더 생성
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir);
}

server.use(express.static(__dirname));
server.use(express.json());

// 데이터 자동 저장 API
server.post("/api/save-data", (req, res) => {
    try {
        const { projectName, parcelId, data } = req.body;
        if (!projectName || !parcelId) {
            return res.status(400).json({ error: "projectName과 parcelId 필수" });
        }

        const filePath = path.join(dataDir, `${projectName}.json`);
        let projectData = {};

        // 기존 데이터 로드
        if (fs.existsSync(filePath)) {
            projectData = JSON.parse(fs.readFileSync(filePath, "utf-8"));
        }

        // 필지 데이터 업데이트
        projectData[parcelId] = data;

        // 파일 저장
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

// 프로젝트 데이터 초기화 API
server.post("/api/clear-data/:projectName", (req, res) => {
    try {
        const filePath = path.join(dataDir, `${req.params.projectName}.json`);
        // 로컬 디스크의 필지 데이터 전부 삭제 (빈 객체 저장)
        fs.writeFileSync(filePath, JSON.stringify({}, null, 2), "utf-8");
        res.json({ success: true, message: "데이터 초기화 완료" });
    } catch (err) {
        console.error("데이터 초기화 에러:", err);
        res.status(500).json({ error: err.message });
    }
});

server.listen(8000, () => {
    console.log("Server started on port 8000");
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
    createWindow();
});

app.on("window-all-closed", () => {
    if (process.platform !== "darwin") {
        app.quit();
    }
});
