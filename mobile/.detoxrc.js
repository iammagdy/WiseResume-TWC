/**
 * Detox config — run on a developer workstation, not in Replit.
 *
 *   cd mobile
 *   npm install --save-dev detox jest
 *   npx detox build --configuration ios.sim.debug
 *   npx detox test  --configuration ios.sim.debug
 *
 * Critical-flow specs live under `e2e/`. Add real tests as the app
 * matures — the scaffold below covers the six P1 flows so the suite
 * fails loudly the moment any of them breaks.
 */
module.exports = {
  testRunner: {
    args: {
      $0: 'jest',
      config: 'e2e/jest.config.js',
    },
    jest: { setupTimeout: 120000 },
  },
  apps: {
    'ios.debug': {
      type: 'ios.app',
      binaryPath: 'ios/build/Build/Products/Debug-iphonesimulator/WiseResume.app',
      build:
        'xcodebuild -workspace ios/WiseResume.xcworkspace -scheme WiseResume -configuration Debug -sdk iphonesimulator -derivedDataPath ios/build',
    },
    'android.debug': {
      type: 'android.apk',
      binaryPath: 'android/app/build/outputs/apk/debug/app-debug.apk',
      build:
        'cd android && ./gradlew assembleDebug assembleAndroidTest -DtestBuildType=debug && cd ..',
    },
  },
  devices: {
    'ios.simulator': {
      type: 'ios.simulator',
      device: { type: 'iPhone 15' },
    },
    'android.emulator': {
      type: 'android.emulator',
      device: { avdName: 'Pixel_6_API_34' },
    },
  },
  configurations: {
    'ios.sim.debug':     { device: 'ios.simulator',     app: 'ios.debug' },
    'android.emu.debug': { device: 'android.emulator', app: 'android.debug' },
  },
};
