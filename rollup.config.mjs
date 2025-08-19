import babel from '@rollup/plugin-babel'
import svgr from '@svgr/rollup'
import external from 'rollup-plugin-peer-deps-external'
import scss from 'rollup-plugin-scss'
import postcss from 'rollup-plugin-postcss'
import copy from 'rollup-plugin-copy'
import pkg from './package.json' assert { type: 'json' }

export default [
  {
    input: 'src/react/index.js',
    output: [
      {
        file: 'react/index.js',
        format: 'es'
      }
    ],
    external: [
      '@mesonfi/to',
      ...Object.keys(pkg.dependencies),
      ...Object.keys(pkg.peerDependencies),
    ],
    plugins: [
      external(),
      postcss({ inject: true }),
      svgr(),
      babel({ exclude: 'node_modules/**' }),
      copy({
        targets: [
          { src: 'src/react/index.d.ts', dest: 'react' }
        ]
      })
    ],
    watch: {
      include: 'src/**',
    }
  },
  {
    input: 'src/MesonTo.js',
    output: [
      {
        file: 'lib/index.js',
        format: 'es',
      },
      {
        file: 'dist/meson-to.js',
        name: 'MesonTo',
        format: 'umd',
        globals: {
          '@wallet-standard/core': 'core'
        }
      },
    ],
    plugins: [
      external(),
      postcss({ inject: true }),
      copy({
        targets: [
          { src: 'src/index.d.ts', dest: 'lib' }
        ]
      })
    ],
    watch: {
      include: 'src/**',
    }
  }
]