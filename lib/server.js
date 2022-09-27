var createError = require('http-errors')
var express = require('express')
var cors = require('cors')
var cuid = require('cuid')
var ReqLogger = require('req-logger')
var healthPoint = require('healthpoint')

var redis = require('./redis')
var version = require('../package.json').version

var router = require('./routes')

var logger = ReqLogger({ version: version })
var health = healthPoint({ version: version }, redis.healthCheck)

var app = express()
app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use(cors({ allowedHeaders: ['Content-Type', 'Authorization', 'accept'] }))

app.use(handler)

app.use('/', router)

// catch 404 and forward to error handler
app.use(function (req, res, next) {
  next(createError(404, { message: 'API not found' }))
})

// error handler
app.use(function (err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message
  res.locals.error = req.app.get('env') === 'devlopment' ? err : {}
  res.status(err.status || 500).send({ message: err.message || 'Server Error' })
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
