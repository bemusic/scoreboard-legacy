const { step, action, cleanup } = require('prescript')
const axios = require('axios')
const Promise = require('bluebird')
const yock = require('../../yock')
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
  drop('GameScore')
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
      create: () => ({
        validateToken: (token) => {
          if (token === 'a') {
            return Promise.resolve({
              playerId: state.playerId,
              userId: 'user|a'
            })
          }
          return Promise.reject(new Error('No known token found?'))
        }
      })
    }
  }
  const services = Object.assign({ }, ...[
    configLayer,
    loggerLayer,
    authenticationLayer,
    databaseLayer,
    configuration.repository,
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
    context.log('OK', state.response.data)
  } catch (e) {
    context.log('Error', e.response.data)
    throw e
  }
}))

cleanup('Quit', () => action(() => {
  setTimeout(() => process.exit(0), 1000)
}))
