const { contextBridge, ipcRenderer } = require("electron");

// Sichere Brücke: die Web-App bekommt NUR diese drei kontrollierten Funktionen.
// Kein direkter System-/Dateizugriff. Jede Aktion wird vorher in der App bestätigt.
contextBridge.exposeInMainWorld("janusDesktop", {
  available: true,
  version: "1.0.5",
  // Screenshot des Bildschirms (Base64-PNG) – zum "Sehen"
  screenshot: () => ipcRenderer.invoke("janus:screenshot"),
  // Bildschirmgröße in Punkten
  size: () => ipcRenderer.invoke("janus:size"),
  // EINE Aktion ausführen (Maus/Tastatur) – wird nur nach Nutzer-Bestätigung aufgerufen
  act: (action) => ipcRenderer.invoke("janus:act", action),
});
