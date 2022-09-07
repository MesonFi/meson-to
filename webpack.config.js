const path = require('path');

module.exports = {
  entry: './src/index.js',
  mode: 'production',
  output: {
    path: path.resolve(__dirname, 'lib'),
    filename: 'meson-to.js',
    library: 'MesonTo',
    libraryTarget: 'var'
  },
};