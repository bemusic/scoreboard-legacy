const { step, action, cleanup, onFinish } = require('prescript')
const axios = require('axios')
const Promise = require('bluebird')
const yock = require('../../yock')
const util = require('util')
const configuration = require('../../configuration')

const asyncAction = (g) => action(Promise.coroutine(g))

step('Connect to the database', () => asyncAction(function * (state, context) {
  const { MongoClient } = require('mongodb')
  const db = yield MongoClient.connect('mongodb://127.0.0.1:27017/bemuse-scoreboard-test')
  state.db = db
}))

step('Clean up the database', () => {
  const drop = (name) => step(`Drop collection \`${name}\``, () => action(state =>
    state.db.collection(name).drop().catch(e => {
      if (e.message === 'ns not found') return
      throw e
    })
  ))
  drop('RankingEntry')
  drop('LegacyUser')
  drop('Player')
})

step('Start server', () => asyncAction(function * (state, context) {
  const configLayer = {
    'config:legacyUser:apiKey': {
      create: () => '{{LEGACY_USER_API_KEY}}'
    }
  }
  const loggerLayer = {
    'logger:http': {
      create: () => {
        const logger = require('log4js').getLogger('http')
        logger.setLevel('ERROR')
        return logger
      }
    }
  }
  const databaseLayer = {
    'database:mongodb': {
      create: () => state.db
    }
  }
  const authenticationLayer = {
    'authentication:tokenValidator': {
      create: ({ playerRepository }) => ({
        validateToken: (token) => {
          const parts = token.split('.')
          if (parts[0] === 'valid') {
            return playerRepository.findByName(parts[1]).then(player => ({
              playerId: player._id,
              userId: parts[2]
            }))
          }
          return Promise.reject(new Error('No known token found?'))
        }
      }),
      dependencies: {
        playerRepository: 'repository:player'
      }
    }
  }
  const services = Object.assign({ }, ...[
    configLayer,
    loggerLayer,
    databaseLayer,
    configuration.repository,
    authenticationLayer,
    configuration.api
  ])
  const container = yock(services, { log: context.log })
  const app = yield container.get('api:app')
  return yield new Promise((resolve, reject) => {
    app.listen(0, function (err) {
      if (err) return reject(err)
      const server = this
      state.server = server
      const serverAddress = server.address()
      state.serverAddress = serverAddress
      context.log('Server address:', serverAddress)
      resolve()
    })
  })
}))

exports.graphql = (query) => step(`GraphQL \`${query}\``, () => asyncAction(function * (state, context) {
  const client = axios.create({
    baseURL: 'http://localhost:' + state.serverAddress.port
  })
  try {
    state.response = yield client.post('/graphql', { query })
    context.log('OK', util.inspect(state.response.data, { depth: 10 }))
  } catch (e) {
    context.log('Error', e.response.data)
    throw e
  }
}))

onFinish(() => {
  cleanup('Quit', () => action(state => {
    state.server.close()
    state.db.close()
  }))
})
