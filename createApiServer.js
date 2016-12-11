'use strict'
const log4js = require('log4js')
const express = require('express')
const graphqlHTTP = require('express-graphql')

const createRoot = require('./createRoot')
const schema = require('./schema')

function createApiServer ({
  logger,
  rankingEntryRepository,
  legacyUserApiKey,
  legacyUserRepository
} = { }) {
  const app = express()

  // Logging
  if (logger) {
    app.use(log4js.connectLogger(logger, { level: log4js.levels.INFO }))
  }

  // Legacy user
  app.use('/legacyusers', createLegacyUserApi(legacyUserApiKey, legacyUserRepository))

  // GraphQL
  if (rankingEntryRepository) {
    const rootValue = createRoot({ rankingEntryRepository })
    app.use(graphqlHTTP({ schema, rootValue, graphiql: true }))
  }

  return app
}

function createLegacyUserApi (apiKey, legacyUserRepository) {
  const router = express.Router()
  router.use(require('body-parser').urlencoded({ extended: false }))
  router.use(function (req, res, next) {
    if (req.body.apiKey !== apiKey) {
      res.status(400).json({ error: 'Invalid API key.' })
      return
    }
    next()
  })
  router.post('/check', function (req, res, next) {
    const usernameOrEmail = String(req.body.usernameOrEmail)
    const password = String(req.body.password)
    Promise.resolve(authenticate(usernameOrEmail, password))
    .then((user) => {
      if (!user) {
        res.status(401).json({ error: 'Unauthenticated' })
        return
      }
      res.json({ })
    })
    .catch(next)
  })
  return router

  function authenticate (usernameOrEmail, password) {
    return Promise.resolve(legacyUserRepository.findUser(usernameOrEmail))
    .then((user) => {
      if (!user) return false
      // TODO perform actual authentication
      return true
    })
  }
}

module.exports = createApiServer
