var express = require('express')
var router = express.Router()
var services = require('./services')

// Add a new target
router.post('/api/targets', services.postTarget)

router.get('/api/targets', services.getAllTargets)

router.get('/api/target/:id', services.getTargetById)

router.post('/api/target/:id', services.updateTargetById)

router.post('/route', services.visitorRequest)

module.exports = router
