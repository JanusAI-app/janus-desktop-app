// Janus Desktop – natives Programm-Gerüst (Electron).
// Aktuell: zeigt die Janus-Web-App in einem eigenen Fenster (ein Code für alles).
// Später: hier kommt die Computersteuerung rein (Maus/Tastatur/Bildschirm über IPC).
const { app, BrowserWindow, shell, Menu, session, desktopCapturer, screen, ipcMain, systemPreferences } =
  require("electron");
const path = require("path");

// Tastenkürzel/Einzeltasten auf nut-js-Keys abbilden (für die Computersteuerung).
function pressCombo(nut, spec) {
  const { keyboard, Key } = nut;
  const map = {
    enter: Key.Enter, return: Key.Enter, tab: Key.Tab, escape: Key.Escape, esc: Key.Escape,
    space: Key.Space, leer: Key.Space, backspace: Key.Backspace, delete: Key.Delete, entf: Key.Delete,
    up: Key.Up, down: Key.Down, left: Key.Left, right: Key.Right,
    hoch: Key.Up, runter: Key.Down, links: Key.Left, rechts: Key.Right,
    cmd: Key.LeftSuper, command: Key.LeftSuper, meta: Key.LeftSuper, super: Key.LeftSuper,
    ctrl: Key.LeftControl, control: Key.LeftControl, strg: Key.LeftControl,
    alt: Key.LeftAlt, option: Key.LeftAlt, shift: Key.LeftShift,
    a: Key.A, b: Key.B, c: Key.C, d: Key.D, e: Key.E, f: Key.F, g: Key.G, l: Key.L,
    n: Key.N, r: Key.R, s: Key.S, t: Key.T, v: Key.V, w: Key.W, x: Key.X, z: Key.Z,
  };
  const parts = String(spec).toLowerCase().split("+").map((s) => s.trim()).filter(Boolean);
  const keys = parts.map((p) => map[p]).filter((k) => k !== undefined);
  if (!keys.length) return Promise.resolve();
  return keyboard.pressKey(...keys).then(() => keyboard.releaseKey(...keys));
}

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
      preload: path.join(__dirname, "preload.js"),
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

  // Google/Microsoft blockieren ihre Anmeldung in App-Fenstern ("Browser nicht sicher").
  // Darum öffnen wir DEREN Login im echten System-Browser; danach schreibt unser
  // Callback die Verbindung (Nutzer per signiertem state erkannt) und das Fenster
  // kehrt zur Verbindungen-Seite zurück.
  const divertOAuth = (e, url) => {
    if (
      !url.startsWith(BASE) &&
      /accounts\.google\.com|login\.microsoftonline\.com|login\.live\.com/i.test(url)
    ) {
      e.preventDefault();
      shell.openExternal(url);
      win.loadURL(BASE + "/dashboard/verbindungen?extern=1", { userAgent: UA });
    }
  };
  win.webContents.on("will-redirect", divertOAuth);
  win.webContents.on("will-navigate", divertOAuth);
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

  // ── Computersteuerung ──────────────────────────────────────────────
  // WICHTIG: "act" wird von der App NUR nach ausdrücklicher Nutzer-Bestätigung
  // aufgerufen. Hier passiert die Ausführung, die Freigabe passiert in der Oberfläche.
  ipcMain.handle("janus:size", () => {
    const d = screen.getPrimaryDisplay();
    return { width: d.size.width, height: d.size.height };
  });
  ipcMain.handle("janus:screenshot", async () => {
    // Ohne Bildschirmaufnahme-Freigabe klar melden (statt schwarzem/leerem Bild).
    if (systemPreferences.getMediaAccessStatus("screen") !== "granted") {
      throw new Error("SCREEN_PERM");
    }
    const d = screen.getPrimaryDisplay();
    const { width, height } = d.size;
    const sources = await desktopCapturer.getSources({
      types: ["screen"],
      thumbnailSize: { width, height },
    });
    const src = sources.find((s) => String(s.display_id) === String(d.id)) || sources[0];
    if (!src) throw new Error("SCREEN_PERM");
    return src.thumbnail.toDataURL();
  });
  // Freigabe-Status abfragen / Einstellungen öffnen / Bedienungshilfen-Dialog auslösen
  ipcMain.handle("janus:perms", () => ({
    screen: systemPreferences.getMediaAccessStatus("screen"),
    accessibility: systemPreferences.isTrustedAccessibilityClient(false),
  }));
  ipcMain.handle("janus:openSettings", (_e, which) => {
    const url =
      which === "accessibility"
        ? "x-apple.systempreferences:com.apple.preference.security?Privacy_Accessibility"
        : "x-apple.systempreferences:com.apple.preference.security?Privacy_ScreenCapture";
    shell.openExternal(url);
  });
  ipcMain.handle("janus:askAccessibility", () => systemPreferences.isTrustedAccessibilityClient(true));
  // Löst den Bildschirmaufnahme-Dialog aus bzw. registriert die aktuelle App in der Liste.
  ipcMain.handle("janus:requestScreen", async () => {
    try {
      await desktopCapturer.getSources({ types: ["screen"], thumbnailSize: { width: 4, height: 4 } });
    } catch {}
    return systemPreferences.getMediaAccessStatus("screen");
  });
  ipcMain.handle("janus:act", async (_e, action) => {
    // Ohne Bedienungshilfen-Freigabe NICHT nut-js aufrufen (sonst Absturz).
    if (!systemPreferences.isTrustedAccessibilityClient(false)) {
      return { ok: false, error: "ACC_PERM" };
    }
    const nut = require("@nut-tree-fork/nut-js");
    const { mouse, keyboard, Point, Button, sleep } = nut;
    mouse.config.mouseSpeed = 2500;
    keyboard.config.autoDelayMs = 6;
    const a = action || {};
    const move = async () => {
      if (typeof a.x === "number" && typeof a.y === "number") {
        await mouse.setPosition(new Point(Math.round(a.x), Math.round(a.y)));
      }
    };
    try {
      switch (a.typ) {
        case "klick": await move(); await mouse.leftClick(); break;
        case "doppelklick": await move(); await mouse.doubleClick(Button.LEFT); break;
        case "rechtsklick": await move(); await mouse.rightClick(); break;
        case "bewege": await move(); break;
        case "tippe": await keyboard.type(String(a.text || "")); break;
        case "taste": await pressCombo(nut, a.taste || ""); break;
        case "scrolle": {
          const n = Math.max(1, Math.min(30, Number(a.betrag) || 5)) * 100;
          if (a.richtung === "hoch") await mouse.scrollUp(n);
          else await mouse.scrollDown(n);
          break;
        }
        case "warte": await sleep(Math.max(100, Math.min(4000, Number(a.ms) || 500))); break;
        case "fertig": break;
        default: return { ok: false, error: "Unbekannte Aktion" };
      }
      return { ok: true };
    } catch (err) {
      return { ok: false, error: String(err && err.message ? err.message : err) };
    }
  });

  // Fenster in eine schmale Leiste (immer oben) verwandeln – oder zurück in Normalgröße.
  // So bleibt der Bildschirm des Nutzers sichtbar, während Janus steuert.
  let barSaved = null;
  ipcMain.handle("janus:controlBar", (e, on) => {
    const win = BrowserWindow.fromWebContents(e.sender);
    if (!win) return;
    if (on) {
      if (!barSaved) barSaved = win.getBounds();
      const wa = screen.getPrimaryDisplay().workArea;
      const w = 680;
      const h = 96;
      win.setAlwaysOnTop(true, "screen-saver");
      try {
        win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
      } catch {}
      win.setBounds({ x: Math.round(wa.x + (wa.width - w) / 2), y: wa.y + 6, width: w, height: h });
    } else {
      win.setAlwaysOnTop(false);
      try {
        win.setVisibleOnAllWorkspaces(false);
      } catch {}
      if (barSaved) {
        win.setBounds(barSaved);
        barSaved = null;
      }
    }
  });

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
