var express = require('express')
var cors = require('cors')
var cuid = require('cuid')
var ReqLogger = require('req-logger')
var healthPoint = require('healthpoint')

var redis = require('./redis')
var version = require('../package.json').version

var logger = ReqLogger({ version: version })
var health = healthPoint({ version: version }, redis.healthCheck)

const app = express()

app.use(cors({ allowedHeaders: ['Content-Type', 'Authorization', 'accept'] }))

app.use(handler)

app.get('/', async (req, res) => {
  res.send('Hello World!')
})

app.get('*', (req, res) => {
  res.sendStatus(404)
})

module.exports = function createServer () {
  return app
}

function handler (req, res, next) {
  if (req.url === '/health') return health(req, res)
  req.id = cuid()
  logger(req, res, { requestId: req.id }, function (info) {
    info.authEmail = (req.auth || {}).email
    console.log(info)
  })
  next()
}
