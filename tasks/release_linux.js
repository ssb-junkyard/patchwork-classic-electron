'use strict';

var Q = require('q');
var gulpUtil = require('gulp-util');
var childProcess = require('child_process');
var jetpack = require('fs-jetpack');
var asar = require('asar');
var utils = require('./utils');
var mktemp = require('mktemp');
var path = require('path');
var os = require('os');

var projectDir;
var releasesDir;
var packName;
var packDir;
var tmpDir;
var readyAppDir;
var manifest;

var init = function () {
    projectDir = jetpack;
    var tmpDirTemplate = path.join(os.tmpdir(), 'package-XXXXXXXX');
    tmpDir = jetpack.cwd(mktemp.createDirSync(tmpDirTemplate));
    releasesDir = projectDir.dir('./releases');
    manifest = projectDir.read('app/package.json', 'json');
    packName = manifest.name + '_' + manifest.version;
    packDir = tmpDir.dir(packName);
    readyAppDir = packDir.cwd('opt', manifest.name);

    return Q();
};

var copyRuntime = function () {
    return projectDir.copyAsync('node_modules/electron-prebuilt/dist', readyAppDir.path(), { overwrite: true });
};

var cleanupRuntime = function () {
    return readyAppDir.removeAsync('resources/default_app');
};

var packageApp = function () {
    var deferred = Q.defer();

    asar.createPackage(projectDir.path('app'), readyAppDir.path('resources/app.asar'), function () {
        deferred.resolve();
    });

    return deferred.promise;
};

var finalize = function () {
    // Create .desktop file from the template
    var desktop = projectDir.read('resources/linux/app.desktop');
    desktop = utils.replace(desktop, {
        name: manifest.name,
        productName: manifest.productName,
        description: manifest.description,
        version: manifest.version,
        author: manifest.author
    });
    packDir.write('usr/share/applications/' + manifest.name + '.desktop', desktop);

    // Copy icon
    projectDir.copy('app/node_modules/ssb-patchwork/ui/img/icon.png',
        readyAppDir.path('icon.png'));

    return Q();
};

var renameApp = function () {
    return readyAppDir.renameAsync("electron", manifest.name);
};

var packToArchive = function () {
    var deferred = Q.defer();
    var archiveFileName = packName + '_amd64.tar.gz';
    var archivePath = releasesDir.path(archiveFileName);
    var appContainerDir = packDir.cwd('opt');

    // Archive the package
    childProcess.execFile('tar', ['czf', archivePath, '-C', appContainerDir.path(), '.'],
        function (error, stdout, stderr) {
            if (error || stderr) {
                console.log('ERROR while archiving package:');
                console.log(error);
                console.log(stderr);
            } else {
                gulpUtil.log('Archive ready', archivePath);
            }
            deferred.resolve();
        });

    return deferred.promise;
}

var packToDebFile = function () {
    var deferred = Q.defer();

    var debFileName = packName + '_amd64.deb';
    var debPath = releasesDir.path(debFileName);

    gulpUtil.log('Creating DEB package...');

    // Counting size of the app in KiB
    var appSize = Math.round(readyAppDir.inspectTree('.').size / 1024);

    // Preparing debian control file
    var control = projectDir.read('resources/linux/DEBIAN/control');
    control = utils.replace(control, {
        name: manifest.name,
        description: manifest.description,
        version: manifest.version,
        author: manifest.author,
        size: appSize
    });
    packDir.write('DEBIAN/control', control);

    // Build the package...
    childProcess.exec('fakeroot dpkg-deb -Zxz --build ' + packDir.path().replace(/\s/g, '\\ ') + ' ' + debPath.replace(/\s/g, '\\ '),
        function (error, stdout, stderr) {
            if (error || stderr) {
                console.log("ERROR while building DEB package:");
                console.log(error);
                console.log(stderr);
            } else {
                gulpUtil.log('DEB package ready!', debPath);
            }
            deferred.resolve();
        });

    return deferred.promise;
};

var cleanClutter = function () {
    return tmpDir.removeAsync('.');
};

module.exports = function () {
    return init()
    .then(copyRuntime)
    .then(cleanupRuntime)
    .then(packageApp)
    .then(finalize)
    .then(renameApp)
    .then(packToArchive)
    .then(packToDebFile)
    .then(cleanClutter)
    .catch(console.error);
};
