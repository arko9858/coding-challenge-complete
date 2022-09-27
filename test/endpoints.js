process.env.NODE_ENV = 'test'

var test = require('ava')
const request = require('supertest')

var server = require('../lib/server')

test.serial('healthcheck', async function (t) {
  var url = '/health'

  const res = await request(server())
    .get(url)

  t.is(res.statusCode, 200, 'correct statusCode')
  t.is(res.body.status, 'OK', 'status is ok')
})

test.before('POST /api/targets', async function (t) {
  var url = '/api/targets'
  var target = {
    id: '1',
    url: 'http://example.com',
    value: '0.50',
    maxAcceptsPerDay: '10',
    accept: {
      geoState: {
        $in: ['ca', 'ny']
      },
      hour: {
        $in: ['13', '14', '15']
      }
    }
  }

  const res = await request(server())
    .post(url)
    .send(target)

  t.is(res.statusCode, 201, 'code 201 indicates a target has been created')
})

test('GET /api/targets', async function (t) {
  var url = '/api/targets'

  const res = await request(server())
    .get(url)

  t.is(res.statusCode, 200, 'correct statusCode')
  t.truthy(res.body.targets.length > 0, 'Should return all targets')
})

test('GET /api/target/1', async function (t) {
  var url = '/api/target/1'

  const res = await request(server())
    .get(url)

  t.is(res.statusCode, 200, 'correct statusCode')

  t.truthy(res.body, 'Should return a target')
})

test('POST /api/target/:id', async function (t) {
  var url = '/api/targets'
  var target = {
    id: '1',
    url: 'http://example.com',
    value: '1.50',
    maxAcceptsPerDay: '10',
    accept: {
      geoState: {
        $in: ['ca', 'ny']
      },
      hour: {
        $in: ['13', '14', '15']
      }
    }
  }
  const res = await request(server())
    .get(url)
    .send(target)

  t.is(res.statusCode, 200, 'correct statusCode')
})

test('POST /route', async function (t) {
  var url = '/route'
  var visitor = {
    geoState: 'ca',
    publisher: 'abc',
    timestamp: '2018-07-19T13:28:59.513Z'
  }
  const res = await request(server())
    .post(url)
    .send(visitor)

  t.is(res.statusCode, 200, 'correct statusCode')
  t.true(!!res.body.target || res.body.decision === 'reject', 'should return a target or decision reject')
})
