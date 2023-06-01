import babel from '@rollup/plugin-babel'
import svgr from '@svgr/rollup'
import postcss from 'rollup-plugin-postcss'
import external from 'rollup-plugin-peer-deps-external'

import pkg from './package.json' assert { type: 'json' }

export default [
  {
    input: 'src/react/index.js',
    output: {
      file: 'lib/index.js',
      format: 'es'
    },
    external: [
      '@mesonfi/to',
      ...Object.keys(pkg.dependencies),
      ...Object.keys(pkg.peerDependencies),
    ],
    plugins: [
      external(),
      postcss({ modules: false }),
      svgr(),
      babel({ exclude: 'node_modules/**' }),
    ],
    watch: {
      include: 'src/**',
    }
  },
  {
    input: 'src/MesonTo.js',
    output: {
      file: 'dist/meson-to.js',
      name: 'MesonTo',
      format: 'umd',
      globals: {
        '@wallet-standard/core': 'core'
      }
    },
    watch: {
      include: 'src/**',
    }
  }
]