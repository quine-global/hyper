module.exports = {
  files: ['test/unit/*'],
  extensions: ['ts'],
  require: ['ts-node/register/transpile-only'],
  verbose: true,
  // Due to permissions issues, Windows needs cache turned off
  cache: false
};
