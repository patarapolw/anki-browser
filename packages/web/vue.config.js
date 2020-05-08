const { spawnSync } = require('child_process')
const path = require('path')

process.env.VUE_APP_PORT = process.env.PORT || '12345'

if (process.env.NODE_ENV !== 'development') {
  spawnSync('npm', ['run', 'build', '--', '--outDir', path.join(__dirname, './public/server')], {
    stdio: 'inherit',
    cwd: '../server'
  })
}

module.exports = {
  devServer: {
    proxy: {
      '^/api': {
        target: `http://localhost:${process.env.VUE_APP_PORT}`
      }
    },
    port: 8080
  },
  pluginOptions: {
    electronBuilder: {
      builderOptions: {
        appId: 'dev.polvcode.anki-browser',
        productName: 'Anki Browser',
        fileAssociations: [
          {
            ext: [
              'apkg',
              'anki2'
            ]
          }
        ]
      }
    }
  }
}
