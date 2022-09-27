var createError = require('http-errors')
var redisUtils = require('./redisUtils')

async function postTarget (req, res, next) {
  try {
    const target = req.body

    if (!target || !target.id) {
      return next(createError(400, { message: 'Target id required' }))
    }

    await redisUtils.setTarget(target)

    res.status(201).send({
      message: 'Target added successfully'
    })
  } catch (err) {
    next(createError(500, { message: err.message || 'Server Error' }))
  }
}

async function getAllTargets (req, res, next) {
  try {
    const targets = await redisUtils.getAllTargets()
    res.send({
      targets: targets.map(target => {
        const { visitCount, visitCountDate, ...rest } = target
        return rest
      })
    })
  } catch (err) {
    next(createError(500, { message: err.message || 'Server Error' }))
  }
}

async function getTargetById (req, res, next) {
  try {
    const id = req.params.id

    if (!id) {
      return next(createError(400, { message: 'Id required' }))
    }

    const target = await redisUtils.getTargetById(id)

    if (!target) {
      return next(createError(404, { message: 'Target not found' }))
    }
    const { visitCount, visitCountDate, ...rest } = target

    res.send({
      target: rest
    })
  } catch (err) {
    next(createError(500, { message: err.message || 'Server Error' }))
  }
}

async function updateTargetById (req, res, next) {
  try {
    const target = req.body

    const id = req.params.id

    if (!target || !id || target.id !== id) {
      return next(createError(400))
    }

    await redisUtils.updateTarget(id, target)

    res.send({
      message: 'Target updated successfully'
    })
  } catch (err) {
    next(createError(500, { message: err.message || 'Server Error' }))
  }
}

function calculateAcceptedTargets (visitor, allTargets) {
  const acceptingTargets = []

  for (let i = 0; i < allTargets.length; i++) {
    if (
      allTargets[i].visitCount !== undefined &&
      Number(allTargets[i].visitCount) >=
        Number(allTargets[i].maxAcceptsPerDay)
    ) { continue }

    const accept = allTargets[i].accept
    if (accept !== undefined) {
      if (
        accept.geoState !== undefined &&
        !accept.geoState.$in.includes(visitor.geoState)
      ) { continue }

      if (
        accept.publisher !== undefined &&
        !accept.publisher.$in.includes(visitor.publisher)
      ) { continue }

      if (
        accept.hour !== undefined &&
        !accept.hour.$in.includes(
          new Date(visitor.timestamp).getUTCHours().toString()
        )
      ) { continue }

      acceptingTargets.push(allTargets[i])
    } else {
      acceptingTargets.push(allTargets[i])
    }
  }

  return acceptingTargets
}

async function visitorRequest (req, res, next) {
  try {
    const visitor = req.body

    const allTargets = await redisUtils.getAllTargets()

    const acceptingTargets = calculateAcceptedTargets(visitor, allTargets)

    if (acceptingTargets.length <= 0) {
      res.send({
        decision: 'reject'
      })
    } else {
      const maxValueTarget = acceptingTargets.reduce((prev, current) => {
        return prev.value > current.value ? prev : current
      })

      const { visitCount, visitCountDate, ...rest } = maxValueTarget

      redisUtils.incrementPageVisit(maxValueTarget.id)
      res.send({
        target: rest
      })
    }
  } catch (err) {
    next(createError(500, { message: err.message || 'Server Error' }))
  }
}

module.exports = {
  postTarget,
  getAllTargets,
  getTargetById,
  updateTargetById,
  visitorRequest
}
