'use strict';

var electron = require('electron-prebuilt');
var childProcess = require('child_process');

var app = childProcess.spawn(electron, ['./app'], {
    stdio: 'inherit'
});

app.on('close', function (code) {
    // User closed the app. Kill the host process.
    process.exit();
});