module.exports = {
  files: ['test/unit/*'],
  extensions: ['ts'],
  require: ['ts-node/register/transpile-only'],
  // Due to permissions issues, Windows needs cache turned off
  cache: false
};
