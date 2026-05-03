module.exports = {
  files: ['test/unit/**/*.ts'],
  typescript: {
    compile: 'tsc',
    rewritePaths: {
      'test/': 'dist/tmp/root/test/',
    }
  },
  verbose: true,
  // Due to permissions issues, Windows needs cache turned off
  cache: false
};
