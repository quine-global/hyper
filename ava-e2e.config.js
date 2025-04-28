module.exports = {
  files: ['test/*'],
  extensions: ['ts'],
  require: ['ts-node/register/transpile-only'],
  timeout: '2m',
  // Due to permissions issues, Windows needs cache turned off
  cache: false
};
