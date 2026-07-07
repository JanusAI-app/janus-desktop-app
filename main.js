// Janus Desktop – natives Programm-Gerüst (Electron).
// Aktuell: zeigt die Janus-Web-App in einem eigenen Fenster (ein Code für alles).
// Später: hier kommt die Computersteuerung rein (Maus/Tastatur/Bildschirm über IPC).
const { app, BrowserWindow, shell, Menu, session } = require("electron");
const path = require("path");

const BASE = process.env.JANUS_URL || "https://janus-inky.vercel.app";
// Die App startet direkt im Produkt (Dashboard bzw. Login), NICHT auf der Website.
const START = BASE + "/dashboard";
// Chrome-ähnlicher User-Agent, damit Google-Login (OAuth) nicht blockt.
const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";

function createWindow() {
  const win = new BrowserWindow({
    width: 1320,
    height: 880,
    minWidth: 380,
    minHeight: 600,
    backgroundColor: "#07070c",
    title: "Janus",
    autoHideMenuBar: true,
    icon: path.join(__dirname, "build", "icon.png"),
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      spellcheck: true,
    },
  });

  win.loadURL(START, { userAgent: UA });

  // Externe Links (z. B. Hilfe, fremde Seiten) im Standardbrowser öffnen,
  // alles von Janus selbst bleibt im Fenster.
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith(BASE)) return { action: "allow" };
    shell.openExternal(url);
    return { action: "deny" };
  });
}

app.whenReady().then(() => {
  // App-Kennung an jede Anfrage an unseren Server hängen -> der Server weiß:
  // "das kommt aus der echten App" und gibt die Produkt-Seiten frei.
  session.defaultSession.webRequest.onBeforeSendHeaders((details, cb) => {
    if (details.url.startsWith(BASE)) {
      details.requestHeaders["x-janus-app"] = "1";
    }
    cb({ requestHeaders: details.requestHeaders });
  });

  // Mikrofon-Zugriff für den Sprachmodus (Kugel) erlauben – sonst blockt Electron es.
  session.defaultSession.setPermissionRequestHandler((_wc, permission, callback) => {
    callback(permission === "media" || permission === "audioCapture");
  });
  session.defaultSession.setPermissionCheckHandler(() => true);

  // Minimales Menü (Kopieren/Einfügen/Neu laden funktionieren so trotzdem).
  const template = [
    { role: "appMenu" },
    { role: "editMenu" },
    {
      label: "Ansicht",
      submenu: [
        { role: "reload", label: "Neu laden" },
        { role: "toggleDevTools", label: "Entwicklerwerkzeuge" },
        { type: "separator" },
        { role: "resetZoom", label: "Zoom zurücksetzen" },
        { role: "zoomIn", label: "Größer" },
        { role: "zoomOut", label: "Kleiner" },
        { type: "separator" },
        { role: "togglefullscreen", label: "Vollbild" },
      ],
    },
    { role: "windowMenu" },
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));

  createWindow();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
