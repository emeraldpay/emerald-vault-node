var build = require('electron-build-env');

var opts = {
    electron: "4.1.0"
};

build(["neon", "build", "--release"], opts, function(err) {
    if (err) {
        console.error('Electron build failed.');
        console.error(err);
    } else {
        console.log('Electron build succeeded!');
    }
});