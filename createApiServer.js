'use strict'
const log4js = require('log4js')
const express = require('express')
const graphqlHTTP = require('express-graphql')

const createRoot = require('./createRoot')
const schema = require('./schema')

function createApiServer ({
  logger,
  rankingEntryRepository,
  legacyUserRepository
} = { }) {
  const app = express()

  // Logging
  if (logger) {
    app.use(log4js.connectLogger(logger, { level: log4js.levels.INFO }))
  }

  // Legacy user
  app.use('/legacyusers', createLegacyUserApi(legacyUserRepository))

  // GraphQL
  if (rankingEntryRepository) {
    const rootValue = createRoot({ rankingEntryRepository })
    app.use(graphqlHTTP({ schema, rootValue, graphiql: true }))
  }

  return app
}

function createLegacyUserApi () {
  const router = express.Router()
  router.post('/check', function (req, res, next) {
    // TODO
    res.end('')
  })
  return router
}

module.exports = createApiServer
