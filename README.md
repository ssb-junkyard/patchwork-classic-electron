patchwork-electron
==============


## Running from source

```
cd ~
git clone https://github.com/ssbc/patchwork-electron.git
cd patchwork-electron
npm install
npm start
```

To use the latest patchwork version, do the following:

```
cd ~
git clone https://github.com/ssbc/patchwork.git
cd patchwork
npm install
npm link
cd ~/patchwork-electron/app
npm link ssb-patchwork
```

## Building

```
npm run release
```

## More info

This repo is based on https://github.com/szwacz/electron-boilerplate.
Check that repo to get more information on the structure and scripts.
