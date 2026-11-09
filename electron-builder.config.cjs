module.exports = {
  appId: 'com.warehouse.desktop',
  productName: 'Warehouse',
  asar: true,
  directories: { output: 'release', buildResources: 'src/public' },
  files: ['build/main/**', 'build/renderer/**', 'src/main/**', 'src/shared/**', 'package.json'],
  afterPack: async (context) => {
    if (context.electronPlatformName === 'win32') {
      const { editWindowsResources } = await import('./scripts/windowsResources.mjs');
      await editWindowsResources(context);
    }
  },
  win: { target: ['nsis', 'portable'], icon: 'src/public/icons/app.ico', signAndEditExecutable: false },
  nsis: { oneClick: false, perMachine: false, allowToChangeInstallationDirectory: true,
    installerIcon: 'src/public/icons/app.ico', uninstallerIcon: 'src/public/icons/app.ico' },
};
