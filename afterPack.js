// Nach dem Packen die Mac-App signieren.
// Bevorzugt eine STABILE lokale Entwickler-Signatur ("Janus Local") – damit behält
// macOS erteilte Freigaben (Bildschirmaufnahme, Bedienungshilfen) über App-Updates hinweg.
// Ist diese Identität nicht vorhanden (z. B. in der GitHub-CI), wird ad-hoc signiert
// (macht die App gültig, sodass sie sich mit Rechtsklick -> Öffnen starten lässt).
const { execSync } = require("child_process");
const path = require("path");

exports.default = async function afterPack(context) {
  if (context.electronPlatformName !== "darwin") return;
  const appName = context.packager.appInfo.productFilename;
  const appPath = path.join(context.appOutDir, `${appName}.app`);

  let identity = "-"; // ad-hoc
  try {
    const out = execSync("security find-identity -p codesigning", { encoding: "utf8" });
    if (out.includes("Janus Local")) identity = "Janus Local";
  } catch {}

  const signArg = identity === "-" ? "-" : `"${identity}"`;
  console.log(`Signatur: ${identity === "-" ? "ad-hoc" : identity} für ${appPath}`);
  execSync(`codesign --force --deep --sign ${signArg} "${appPath}"`, { stdio: "inherit" });
};
