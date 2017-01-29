const log4js = require('log4js')
const MongoClient = require('mongodb').MongoClient
const Promise = require('bluebird')
const MongoDBRepositoryFactory = require('./MongoDBRepositoryFactory')
const createApiServer = require('./createApiServer')
const createTokenValidator = require('./createTokenValidator')
const axios = require('axios')

function main () {
  return Promise.coroutine(function * () {
    const logger = log4js.getLogger('main')

    logger.info('Loading certificate...')
    const JWT_CERTIFICATE_URL = requiredEnv('JWT_CERTIFICATE_URL')
    const certificate = (yield axios.get(JWT_CERTIFICATE_URL)).data

    logger.info('Connecting to MongoDB...')
    const DEFAULT_MONGO_URL = 'mongodb://127.0.0.1:27017/bemuse'
    const suppliedMongoUrl = process.env.MONGO_URL || process.env.MONGODB_URI
    const db = yield connectMongo(suppliedMongoUrl || DEFAULT_MONGO_URL)
    const factory = new MongoDBRepositoryFactory({ db })
    const port = +process.env.PORT || 8008

    logger.info('Creating API...')
    const app = createApiServer({
      logger: log4js.getLogger('HTTP'),
      legacyUserApiKey: requiredEnv('LEGACY_USER_API_KEY'),
      legacyUserRepository: factory.createLegacyUserRepository(),
      rankingEntryRepository: factory.createRankingEntryRepository(),
      playerRepository: factory.createPlayerRepository(),
      tokenValidator: createTokenValidator({ certificate })
    })

    logger.info('Let’s go!!!')
    runApiServer(app, port)
  })()
}

function requiredEnv (key) {
  const value = process.env[key]
  if (!value) throw new Error(`Required environment variable: ${key}`)
  return value
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

function runApiServer (app, port) {
  app.listen(port, function (err) {
    if (err) throw err
    const address = this.address()
    log4js.getLogger('HTTP').info('Listening on port ' + address.port)
  })
}
