const {spawn} = require('node:child_process');
const path = require('node:path');
if (process.env.NODE_ENV === 'production') throw new Error('Local authentication is disabled in production');
spawn(process.execPath, [require.resolve('expo/bin/cli'), 'start', '--web', '--localhost'], {
  cwd: path.join(__dirname, '../apps/mobile'), stdio: 'inherit',
  env: {...process.env, EXPO_PUBLIC_ENABLE_DEV_AUTH: 'true', EXPO_PUBLIC_API_URL: 'http://localhost:8000'},
});
