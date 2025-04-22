import path from 'path';

import Copy from 'copy-webpack-plugin';
import TerserPlugin from 'terser-webpack-plugin';
import webpack from 'webpack';

const nodeEnv = process.env.NODE_ENV || 'development';
const isProd = nodeEnv === 'production';

const config: webpack.Configuration[] = [
  {
    mode: 'none',
    name: 'hyper-app',
    resolve: {
      extensions: ['.js', '.jsx', '.ts', '.tsx', '.json']
    },
    entry: './app/index.ts',
    output: {
      path: path.join(__dirname, 'target'),
      filename: 'ignore_this.js'
    },
    module: {
      rules: [
        {
          test: /\.(js|jsx|ts|tsx)$/,
          exclude: /node_modules/,
          loader: 'null-loader'
        }
      ]
    },
    plugins: [
      new Copy({
        patterns: [
          {
            from: './app/*.html',
            globOptions: {ignore: ['**/node_modules/**']},
            to: '[name][ext]'
          },
          {
            from: './app/*.json',
            globOptions: {ignore: ['**/node_modules/**']},
            to: '[name][ext]'
          },
          {
            from: './app/config/*.json',
            globOptions: {ignore: ['**/node_modules/**']},
            to: './config/[name][ext]'
          },
          {
            from: './app/yarn.lock',
            to: 'yarn.lock'
          },
          {
            from: './app/keymaps/*.json',
            globOptions: {ignore: ['**/node_modules/**']},
            to: './keymaps/[name][ext]'
          },
          {
            from: './app/static',
            to: './static'
          }
        ]
      })
    ],
    target: 'electron-main'
  },

  {
    mode: 'none',
    name: 'hyper',
    resolve: {
      alias: {
        react: path.resolve(__dirname, 'node_modules/react'),
        'react-dom': path.resolve(__dirname, 'node_modules/react-dom')
      },
      extensions: ['.js', '.jsx', '.ts', '.tsx', '.d.ts']
    },
    devtool: isProd ? 'hidden-source-map' : 'cheap-module-source-map',
    entry: './lib/index.tsx',
    output: {
      path: path.join(__dirname, 'target', 'renderer'),
      filename: 'bundle.js'
    },
    module: {
      rules: [
        {
          test: /\.(js|jsx|ts|tsx)$/,
          exclude: /node_modules/,
          loader: 'babel-loader'
        },
        {
          test: /\.json/,
          loader: 'json-loader'
        },
        // for xterm.js
        {
          test: /\.css$/,
          use: ['style-loader', 'css-loader']
        }
      ]
    },
    externals: {
      'color-convert': 'commonjs color-convert',
      'color-string': 'commonjs color-string',
      columnify: 'commonjs columnify',
      lodash: 'commonjs lodash',
      ms: 'commonjs ms',
      'normalize-url': 'commonjs normalize-url',
      'parse-url': 'commonjs parse-url',
      'php-escape-shell': 'commonjs php-escape-shell',
      plist: 'commonjs plist',
      // 'react-dom': 'commonjs react-dom',
      'redux-thunk': 'commonjs redux-thunk',
      redux: 'commonjs redux',
      reselect: 'commonjs reselect',
      'seamless-immutable': 'commonjs seamless-immutable',
      stylis: 'commonjs stylis',
      '@xterm/addon-unicode11': 'commonjs @xterm/addon-unicode11',
      args: 'commonjs args',
      mousetrap: 'commonjs mousetrap',
      open: 'commonjs open',
      '@xterm/addon-fit': 'commonjs @xterm/addon-fit',
      '@xterm/addon-image': 'commonjs @xterm/addon-image',
      '@xterm/addon-search': 'commonjs @xterm/addon-search',
      '@xterm/addon-web-links': 'commonjs @xterm/addon-web-links',
      '@xterm/addon-webgl': 'commonjs @xterm/addon-webgl',
      '@xterm/addon-canvas': 'commonjs @xterm/addon-canvas',
      xterm: 'commonjs xterm'
    },
    plugins: [
      new webpack.IgnorePlugin({resourceRegExp: /.*\.js.map$/i}),

      new webpack.DefinePlugin({
        'process.env': {
          NODE_ENV: JSON.stringify(nodeEnv)
        }
      }),
      new Copy({
        patterns: [
          {
            from: './assets',
            to: './assets'
          }
        ]
      })
    ],
    optimization: {
      minimize: isProd ? true : false,
      minimizer: [new TerserPlugin()]
    },
    target: 'electron-renderer'
  },
  {
    mode: 'none',
    name: 'hyper-cli',
    resolve: {
      extensions: ['.js', '.jsx', '.ts', '.tsx', '.json']
    },
    devtool: isProd ? false : 'cheap-module-source-map',
    entry: './cli/index.ts',
    output: {
      path: path.join(__dirname, 'bin'),
      filename: 'cli.js'
    },
    module: {
      rules: [
        {
          test: /\.(js|jsx|ts|tsx)$/,
          exclude: /node_modules/,
          loader: 'babel-loader'
        },
        {
          test: /index.js/,
          loader: 'shebang-loader',
          include: [/node_modules\/rc/]
        }
      ]
    },
    plugins: [
      // spawn-sync is required by execa if node <= 0.10
      new webpack.IgnorePlugin({resourceRegExp: /(.*\.js.map|spawn-sync)$/i}),
      new webpack.DefinePlugin({
        'process.env.NODE_ENV': JSON.stringify(nodeEnv)
      })
    ],
    optimization: {
      minimize: isProd ? true : false,
      minimizer: [new TerserPlugin()]
    },
    target: 'node'
  }
];

export default config;
