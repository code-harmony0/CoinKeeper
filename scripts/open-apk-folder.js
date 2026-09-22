const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');

const flavor = process.argv[2] || 'lite';
const buildType = process.argv[3] || 'release';

const folderPath = path.resolve(__dirname, '..', 'android', 'app', 'build', 'outputs', 'apk', flavor, buildType);

console.log(`\n📦 APK Directory: ${folderPath}`);

if (!fs.existsSync(folderPath)) {
  console.warn(`⚠️ Directory does not exist: ${folderPath}`);
  process.exit(0);
}

// Find apk file if exists to display it
const files = fs.readdirSync(folderPath);
const apkFile = files.find(f => f.endsWith('.apk'));
if (apkFile) {
  console.log(`🎯 Generated APK: ${apkFile}`);
}

const openCommand = process.platform === 'darwin'
  ? `open "${folderPath}"`
  : process.platform === 'win32'
  ? `explorer "${folderPath}"`
  : `xdg-open "${folderPath}"`;

exec(openCommand, (err) => {
  if (err) {
    console.warn(`Could not open folder automatically: ${err.message}`);
  } else {
    console.log(`📂 Opened APK folder in file manager.\n`);
  }
});
