'use strict'
const log4js = require('log4js')
const express = require('express')
const graphqlHTTP = require('express-graphql')
const cors = require('cors')

const schema = require('./schema')
const createRoot = require('./createRoot')
const createLegacyUserApi = require('./createLegacyUserApi')

function createApiServer ({
  logger,
  rankingEntryRepository,
  playerRepository,
  legacyUserApiKey,
  legacyUserRepository,
  tokenValidator
} = { }) {
  const app = express()

  // Logging
  if (logger) {
    app.use(log4js.connectLogger(logger, { level: log4js.levels.INFO }))
  }

  // Legacy user
  app.use('/legacyusers', createLegacyUserApi({
    legacyUserApiKey,
    legacyUserRepository,
    playerRepository
  }))

  // GraphQL
  if (rankingEntryRepository) {
    const rootValue = createRoot({
      rankingEntryRepository,
      legacyUserRepository,
      playerRepository,
      tokenValidator
    })
    app.use(cors())
    app.use(graphqlHTTP({ schema, rootValue, graphiql: true }))
  }

  return app
}

module.exports = createApiServer
