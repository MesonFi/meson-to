module.exports = {
  plugins: [
    ["@babel/plugin-transform-modules-umd", {
      exactGlobals: true,
      globals: {
        index: 'MesonTo'
      }
    }]
  ],
  presets: [
    [
      '@babel/preset-env',
      {
        targets: {
          node: 'current',
        },
      },
    ],
  ],
};