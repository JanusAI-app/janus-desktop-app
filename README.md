# Janus Desktop

Echtes Desktop-Programm (Electron) rund um die Janus-Web-App.
**Ein Code für alles:** Das Fenster lädt https://janus-inky.vercel.app.
Fundament für die spätere **Computersteuerung** (Maus/Tastatur/Bildschirm über IPC).

## Starten (zum Ausprobieren, ohne Bauen)
```bash
cd desktop
npm install
node node_modules/electron/install.js   # falls das Electron-Binary fehlt (npm blockt postinstall)
npm start
```
Andere Adresse testen: `JANUS_URL=http://localhost:3000 npm start`

## Bauen (fertige App-Datei erzeugen)
```bash
npm run build:mac     # -> dist/Janus-<version>-arm64.dmg   (nur auf einem Mac)
npm run build:win     # -> dist/Janus Setup <version>.exe   (nur auf Windows)
npm run build:linux   # -> dist/Janus-<version>.AppImage    (nur auf Linux)
```
Mac-Signatur ist aus (`mac.identity=null`) → beim ersten Öffnen Rechtsklick → „Öffnen".
Für Windows/Linux ohne die jeweiligen Rechner: kostenloser GitHub-Actions-Build (später einrichten).

## Icons neu erzeugen
Quelle: `build/icon-master.png` (randlose Kachel). Danach:
```bash
python3 ../scratchpad/make_icons.py   # erzeugt .icns/.ico/.png + Web-Icons
iconutil -c icns build/Janus.iconset -o build/icon.icns
```

## Später: Computersteuerung
In `main.js` per `ipcMain` Befehle bereitstellen und im Renderer über ein `preload.js`
(contextBridge) aufrufen. Für OS-Automatisierung z. B. `@nut-tree/nut-js`.
Wichtig: sichtbare Freigabe/Zustimmung pro Aktion (Sicherheits-Story von Janus).
