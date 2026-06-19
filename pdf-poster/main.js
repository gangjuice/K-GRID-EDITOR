const { app, BrowserWindow, ipcMain, dialog } = require('electron')
const path = require('path')
const fs   = require('fs')

const CONFIG_PATH = path.join(app.getPath('userData'), 'pdf-poster-config.json')

let mainWindow      = null
let automationWin   = null

/* ── config helpers ─────────────────────────────────────────────────── */
function loadConfig() {
  try { if (fs.existsSync(CONFIG_PATH)) return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8')) }
  catch (_) {}
  return {}
}

function persistConfig(cfg) {
  try { fs.writeFileSync(CONFIG_PATH, JSON.stringify(cfg, null, 2), 'utf8') } catch (_) {}
}

/* ── main window ────────────────────────────────────────────────────── */
function createMain() {
  mainWindow = new BrowserWindow({
    width: 1100, height: 760, minWidth: 800, minHeight: 600,
    title: 'PDF → 인트라넷 게시글 자동 작성',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  })
  mainWindow.loadFile(path.join(__dirname, 'index.html'))
  mainWindow.on('closed', () => { mainWindow = null })
}

/* ── IPC: file selection ────────────────────────────────────────────── */
ipcMain.handle('select-pdf-files', async () => {
  const r = await dialog.showOpenDialog(mainWindow, {
    title: 'PDF 파일 선택',
    filters: [{ name: 'PDF 파일', extensions: ['pdf'] }],
    properties: ['openFile', 'multiSelections']
  })
  return r.canceled ? [] : r.filePaths
})

/* ── IPC: PDF parsing ───────────────────────────────────────────────── */
ipcMain.handle('parse-pdf', async (_ev, filePath) => {
  try {
    const pdfParse = require('pdf-parse')
    const buf  = fs.readFileSync(filePath)
    const data = await pdfParse(buf)
    return { success: true, text: data.text, pages: data.numpages }
  } catch (e) {
    return { success: false, error: e.message }
  }
})

/* ── IPC: config ────────────────────────────────────────────────────── */
ipcMain.handle('load-config', () => loadConfig())
ipcMain.handle('save-config', (_ev, cfg) => { persistConfig(cfg); return true })

/* ── IPC: intranet automation ───────────────────────────────────────── */
ipcMain.handle('post-to-intranet', (_ev, { config: cfg, postData }) => {
  return new Promise(async (resolve) => {
    if (automationWin) { try { automationWin.close() } catch(_){} automationWin = null }

    automationWin = new BrowserWindow({
      width: 1200, height: 800,
      show: !!cfg.showBrowser,
      webPreferences: { nodeIntegration: false, contextIsolation: true, webSecurity: false }
    })
    automationWin.on('closed', () => { automationWin = null })

    const delay = ms => new Promise(r => setTimeout(r, ms))

    const run = async (js) => automationWin.webContents.executeJavaScript(js)

    try {
      /* 1. Load login page */
      await automationWin.loadURL(cfg.loginUrl)
      await delay(1500)

      /* 2. Fill & submit login form */
      const loginJS = `(function(){
        try {
          var u = document.querySelector(${q(cfg.selLoginUser)});
          var p = document.querySelector(${q(cfg.selLoginPass)});
          if (!u || !p) return { ok:false, err:'로그인 입력 필드를 찾지 못했습니다 (selector: ${cfg.selLoginUser})' };
          setNative(u, ${q(cfg.loginId)});
          setNative(p, ${q(cfg.loginPw)});
          var btn = document.querySelector(${q(cfg.selLoginBtn)});
          if (btn) btn.click();
          else { var f = u.closest('form'); if(f) f.submit(); }
          return { ok:true };
        } catch(e){ return { ok:false, err:e.message }; }
        function setNative(el, val) {
          var desc = Object.getOwnPropertyDescriptor(el.tagName==='INPUT'
            ? HTMLInputElement.prototype : HTMLTextAreaElement.prototype, 'value');
          if (desc) desc.set.call(el, val);
          else el.value = val;
          el.dispatchEvent(new Event('input',  {bubbles:true}));
          el.dispatchEvent(new Event('change', {bubbles:true}));
        }
      })()`
      const lr = await run(loginJS)
      if (!lr.ok) throw new Error(lr.err)

      /* 3. Wait for post-login navigation */
      await new Promise(res => {
        const t = setTimeout(res, 6000)
        automationWin.webContents.once('did-stop-loading', () => { clearTimeout(t); res() })
      })
      await delay(1000)

      /* 4. Navigate to post creation page */
      await automationWin.loadURL(cfg.postUrl)
      await delay(2000)

      /* 5. Fill post form */
      const fillJS = `(function(){
        try {
          var fields = ${JSON.stringify({
            title:    { sel: cfg.selTitle,    val: postData.title    || '' },
            content:  { sel: cfg.selContent,  val: postData.content  || '' },
            date:     { sel: cfg.selDate,     val: postData.date     || '' },
            docNum:   { sel: cfg.selDocNum,   val: postData.docNum   || '' },
          })};
          for (var k in fields) {
            var f = fields[k];
            if (!f.sel) continue;
            var el = document.querySelector(f.sel);
            if (!el) continue;
            setNative(el, f.val);
          }
          return { ok:true };
        } catch(e){ return { ok:false, err:e.message }; }
        function setNative(el, val) {
          var desc = Object.getOwnPropertyDescriptor(el.tagName==='INPUT'
            ? HTMLInputElement.prototype : HTMLTextAreaElement.prototype, 'value');
          if (desc) desc.set.call(el, val);
          else el.value = val;
          el.dispatchEvent(new Event('input',  {bubbles:true}));
          el.dispatchEvent(new Event('change', {bubbles:true}));
        }
      })()`
      const fr = await run(fillJS)
      if (!fr.ok) throw new Error(fr.err)

      /* 6. Auto-submit (optional) */
      if (cfg.autoSubmit && cfg.selSubmit) {
        await delay(600)
        const sr = await run(`(function(){
          var b = document.querySelector(${q(cfg.selSubmit)});
          if (!b) return { ok:false, err:'제출 버튼을 찾지 못했습니다' };
          b.click(); return { ok:true };
        })()`)
        if (!sr.ok) throw new Error(sr.err)
        await delay(2000)
      }

      if (!cfg.showBrowser && automationWin) automationWin.close()
      resolve({ success: true })
    } catch (e) {
      if (!cfg.showBrowser && automationWin) try { automationWin.close() } catch(_){}
      resolve({ success: false, error: e.message })
    }
  })
})

/* ── IPC: open visible intranet browser ─────────────────────────────── */
ipcMain.handle('open-intranet-browser', (_ev, url) => {
  const w = new BrowserWindow({
    width: 1200, height: 800,
    webPreferences: { nodeIntegration: false, contextIsolation: true, webSecurity: false }
  })
  if (url) w.loadURL(url)
  return true
})

/* ── helpers ────────────────────────────────────────────────────────── */
function q(s) { return JSON.stringify(s || '') }

/* ── lifecycle ──────────────────────────────────────────────────────── */
app.whenReady().then(createMain)
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit() })
app.on('activate', () => { if (!mainWindow) createMain() })
