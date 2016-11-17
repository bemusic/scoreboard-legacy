const graphqlHTTP = require('express-graphql')
const log4js = require('log4js')
const MongoClient = require('mongodb').MongoClient
const express = require('express')
const Promise = require('bluebird')
const MongoDBRepositoryFactory = require('./MongoDBRepositoryFactory')
const createRoot = require('./createRoot')
const schema = require('./schema')

function main () {
  return Promise.coroutine(function * () {
    const DEFAULT_MONGO_URL = 'mongodb://127.0.0.1:27017/bemuse'
    const db = yield connectMongo(process.env.MONGO_URL || DEFAULT_MONGO_URL)
    const factory = new MongoDBRepositoryFactory({ db })
    const port = +process.env.PORT || 8008
    const root = createRoot({
      rankingEntryRepository: factory.createRankingEntryRepository()
    })
    runGraphQLServer(port, root)
  })()
}

main().catch((e) => setTimeout(() => { throw e }))

function connectMongo (mongoUrl) {
  const logger = log4js.getLogger('MongoDB')
  logger.info('Connecting to MongoDB...')
  return MongoClient.connect(mongoUrl).then((db) => {
    logger.info('Connected to MongoDB!')
    return db
  })
}

function runGraphQLServer (port, rootValue) {
  const app = express()
  const logger = log4js.getLogger('HTTP')
  app.use(log4js.connectLogger(logger, { level: log4js.levels.INFO }))
  app.use(graphqlHTTP({
    schema: schema,
    rootValue: rootValue,
    graphiql: true
  }))
  app.listen(port, function (err) {
    if (err) throw err
    const address = this.address()
    logger.info('Listening on port ' + address.port)
  })
}
