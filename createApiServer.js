'use strict'
const log4js = require('log4js')
const express = require('express')
const graphqlHTTP = require('express-graphql')
const cors = require('cors')

const schema = require('./schema')

function createApiServer ({
  logger,
  legacyUserApi,
  graphqlRoot
} = { }) {
  const app = express()

  // Logging
  if (logger) {
    app.use(log4js.connectLogger(logger, { level: log4js.levels.INFO }))
  }

  // Legacy user
  app.use('/legacyusers', legacyUserApi)

  // GraphQL
  app.use(cors())
  app.use(graphqlHTTP({ schema, rootValue: graphqlRoot, graphiql: true }))

  return app
}

module.exports = createApiServer
