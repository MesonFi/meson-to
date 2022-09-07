const express = require('express')
const compression = require('compression')
const path = require('path')

const {
  NODE_ENV = 'development',
  PORT = 8080
} = process.env

const app = express()
if (NODE_ENV !== 'development') {
  app.use((req, res, next) => {
    if (req.headers['x-forwarded-proto'] !== 'https') {
      return res.redirect(['https://', req.get('Host'), req.url].join(''))
    }
    return next()
  })
}
app.use(compression())
app.use(express.static('./build'))
app.disable('x-powered-by')

app.get('/*', function (req, res) {
  res.sendFile(path.join(__dirname, '/build/index.html'))
})

app.listen(PORT)