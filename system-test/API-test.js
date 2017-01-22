const { step, action, pending } = require('prescript')
const axios = require('axios')
const Promise = require('bluebird')
const assert = require('assert')

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
  const createApiServer = require('../createApiServer')
  const log4js = require('log4js')
  const MongoDBRepositoryFactory = require('../MongoDBRepositoryFactory')

  const db = state.db
  const factory = new MongoDBRepositoryFactory({ db })
  const logger = log4js.getLogger('HTTP')
  logger.setLevel('ERROR')

  const app = createApiServer({
    logger,
    legacyUserApiKey: '{{LEGACY_USER_API_KEY}}',
    legacyUserRepository: factory.createLegacyUserRepository(),
    rankingEntryRepository: factory.createRankingEntryRepository(),
    playerRepository: factory.createPlayerRepository()
  })
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

const graphql = (query) => step(`GraphQL \`${query}\``, () => asyncAction(function * (state, context) {
  const client = axios.create({
    baseURL: 'http://localhost:' + state.serverAddress.port
  })
  try {
    state.response = yield client.post('/graphql', { query })
    context.log('OK', state.response.data)
  } catch (e) {
    context.log('Error', e.response.data)
  }
}))

step('Test player registration', () => {
  step('Query flicknote', () => graphql(`query { player(name: "flicknote") { id } }`))
  step('User should be null', () => action(state => {
    assert.deepEqual(state.response.data, {
      data: {
        player: null
      }
    })
  }))

  step('Register flicknote', () => graphql(`mutation { registerPlayer(name: "flicknote") { id } }`))
  step('Should receive the ID', () => action(state => {
    const playerId = state.response.data.data.registerPlayer.id
    assert.equal(typeof playerId, 'string')
    state.playerId = playerId
  }))

  step('Query flicknote', () => graphql(`query { player(name: "flicknote") { id } }`))
  step('id should be correct', () => action(state => {
    assert.deepEqual(state.response.data, {
      data: {
        player: {
          id: state.playerId
        }
      }
    })
  }))
})

step('Quit', () => action(() => {
  setTimeout(() => process.exit(0), 1000)
}))
