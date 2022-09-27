var { promisify } = require('util')
var redis = require('./redis')

const lrangeAsync = promisify(redis.LRANGE).bind(redis)
const hexistsAsync = promisify(redis.HEXISTS).bind(redis)
const hgetallAsync = promisify(redis.HGETALL).bind(redis)
const hincrybyAsync = promisify(redis.HINCRBY).bind(redis)
const hgetAsync = promisify(redis.HGET).bind(redis)

function multiPromisified (commands) {
  const multi = redis.multi(commands)
  return promisify(multi.exec).call(multi)
}

async function setTarget (target) {
  const targetExist = await hexistsAsync(`target:${target.id}`, 'id')

  if (targetExist) {
    throw new Error('Target with same id already exist')
  }

  await multiPromisified([
    ['HSET', `target:${target.id}`, 'id', target.id],
    ['HSET', `target:${target.id}`, 'url', target.url],
    ['HSET', `target:${target.id}`, 'value', target.value],
    ['HSET', `target:${target.id}`, 'maxAcceptsPerDay', target.maxAcceptsPerDay],
    ['HSET', `target:${target.id}`, 'accept', JSON.stringify(target.accept)],
    ['HSET', `target:${target.id}`, 'visitCount', 0],
    ['HSET', `target:${target.id}`, 'visitCountDate', new Date().getDate().toString()],
    ['RPUSH', 'targets', `target:${target.id}`]
  ])
}

async function getAllTargets () {
  const targets = []
  const results = await lrangeAsync('targets', 0, -1)

  if (results && results.length > 0) {
    for (let i = 0; i < results.length; i++) {
      const target = await hgetallAsync(results[i])

      if (!target) continue

      if (target.accept !== undefined) {
        target.accept = JSON.parse(target.accept)
      }

      targets.push(target)
    }
  }

  return targets
}

async function getTargetById (id) {
  const target = await hgetallAsync(`target:${id}`)

  if (!target) return null

  if (target.accept !== undefined) {
    target.accept = JSON.parse(target.accept)
  }

  return target
}

async function updateTarget (id, target) {
  const targetExist = hexistsAsync(`target:${id}`, 'id')

  if (!targetExist) throw new Error('Target doesn\'t exist')

  await multiPromisified([
    ['HSET', `target:${id}`, 'url', target.url],
    ['HSET', `target:${id}`, 'value', target.value],
    ['HSET', `target:${id}`, 'maxAcceptsPerDay', target.maxAcceptsPerDay],
    ['HSET', `target:${id}`, 'accept', JSON.stringify(target.accept)]
  ])
}

async function incrementPageVisit (targetId) {
  const visitCountDate = await hgetAsync(`target:${targetId}`, 'visitCountDate')

  if (visitCountDate === new Date().getDate().toString()) {
    await hincrybyAsync(`target:${targetId}`, 'visitCount', 1)
  } else {
    // if visitCountDate is not today then set date to today and visitCount to 1
    await multiPromisified([
      ['HSET', `target:${targetId}`, 'visitCount', 1],
      ['HSET', `target:${targetId}`, 'visitCountDate', new Date().getDate().toString()]
    ])
  }
}

module.exports = { getAllTargets, setTarget, getTargetById, updateTarget, incrementPageVisit }
