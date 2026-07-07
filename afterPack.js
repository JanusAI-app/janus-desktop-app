// Nach dem Packen die Mac-App "ad-hoc" signieren.
// Grund: Ohne (kostenpflichtiges) Apple-Zertifikat zeigt macOS bei aus dem Internet
// geladenen Apps sonst "ist beschädigt". Eine Ad-hoc-Signatur macht die App gültig,
// sodass sie sich mit Rechtsklick -> Öffnen normal starten lässt.
const { execSync } = require("child_process");
const path = require("path");

exports.default = async function afterPack(context) {
  if (context.electronPlatformName !== "darwin") return;
  const appName = context.packager.appInfo.productFilename;
  const appPath = path.join(context.appOutDir, `${appName}.app`);
  console.log("Ad-hoc-Signatur für", appPath);
  execSync(`codesign --force --deep --sign - "${appPath}"`, { stdio: "inherit" });
};
