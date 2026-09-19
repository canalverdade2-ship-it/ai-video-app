const fs = require('fs');
let yml = fs.readFileSync('.github/workflows/build-apk.yml', 'utf8');
yml = yml.replace('npx expo prebuild --platform android --clean', 'export NODE_OPTIONS="--max-old-space-size=4096"\n        npx expo prebuild --platform android --clean');
fs.writeFileSync('.github/workflows/build-apk.yml', yml);
