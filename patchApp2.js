const fs = require('fs');
let code = fs.readFileSync('App.js', 'utf8');

code = code.replace("import * as MediaLibrary from 'expo-media-library';", "import * as Sharing from 'expo-sharing';");
code = code.replace("MediaLibrary.requestPermissionsAsync();", "// Permissions removed");
code = code.replace("await MediaLibrary.saveToLibraryAsync(resultUri);", "await Sharing.shareAsync(resultUri);");
code = code.replace("await MediaLibrary.saveToLibraryAsync(videoUri);", "await Sharing.shareAsync(videoUri);");

fs.writeFileSync('App.js', code);
