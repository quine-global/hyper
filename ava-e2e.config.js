module.exports = {
  files: ['test/*'],
  extensions: ['ts'],
  require: ['ts-node/register/transpile-only'],
  timeout: '2m',
  verbose: true,
  // Due to permissions issues, Windows needs cache turned off
  cache: false
};
