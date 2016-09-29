// run this script with electron
// needed because electron-rebuild doesn't handle "prebuild" modules like leveldown and sodium
// based on https://github.com/juliangruber/require-rebuild/blob/master/index.js

'use strict';

var fs = require('fs');
var join = require('path').join;
var childProcess = require('child_process');
var nodeModulesPath = join(__dirname, '..', 'app', 'node_modules');

fs.readdirSync(nodeModulesPath).forEach(function (name) {
  var dir = join(nodeModulesPath, name);
  var packageInfo = getPackageInfo(dir);
  if (checkForPrebuild(packageInfo)) {
    console.log('rebuild ' + dir)
    childProcess.spawnSync('prebuild', [
      '--install',
      '--abi=' + process.versions.modules,
      '--target=' + process.versions.node
    ], {
      cwd: dir,
      stdio: 'inherit'
    });
  }
});

process.exit(0);

function getPackageInfo (path) {
  try {
    return JSON.parse(fs.readFileSync(join(path, 'package.json')));
  } catch (ex) {}
}

function checkForPrebuild (packageInfo) {
  var reg = /prebuild/;
  return packageInfo && packageInfo.scripts && (reg.test(packageInfo.scripts.install) || reg.test(packageInfo.scripts.prebuild));
}
