'use strict'
const log4js = require('log4js')
const express = require('express')
const graphqlHTTP = require('express-graphql')
const bcrypt = require('bcrypt')

const createRoot = require('./createRoot')
const schema = require('./schema')

function createApiServer ({
  logger,
  rankingEntryRepository,
  playerRepository,
  legacyUserApiKey,
  legacyUserRepository
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
      playerRepository
    })
    app.use(graphqlHTTP({ schema, rootValue, graphiql: true }))
  }

  return app
}

function createLegacyUserApi ({
  legacyUserApiKey: apiKey,
  legacyUserRepository,
  playerRepository
}) {
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
    const playerIdOrEmail = String(req.body.playerIdOrEmail)
    const password = String(req.body.password)
    Promise.resolve(authenticate(playerIdOrEmail, password))
    .then((user) => {
      if (!user) {
        res.status(401).json({ error: 'Unauthenticated' })
        return
      }
      return findOrCreatePlayer(user.username)
      .then((player) => {
        res.json(formatResult(user, player))
      })
    })
    .catch(next)
  })

  router.post('/get', function (req, res, next) {
    const playerIdOrEmail = String(req.body.playerIdOrEmail)
    findLegacyUser(playerIdOrEmail)
    .then((user) => {
      if (!user) {
        res.status(404).json({ error: 'Not found' })
        return
      }
      return findOrCreatePlayer(user.username)
      .then((player) => {
        res.json(formatResult(user, player))
      })
    })
    .catch(next)
  })

  return router

  function formatResult (user, player) {
    return {
      _id: user._id,
      username: player._id,
      email: user.email,
      emailVerified: user.emailVerified,
      createdAt: user.createdAt
    }
  }

  function findOrCreatePlayer (name) {
    return playerRepository.findByName(name)
      .then(foundPlayer => {
        return foundPlayer || playerRepository.register(name)
          .then(() => playerRepository.findByName(name))
      })
  }

  function findLegacyUser (playerIdOrEmail) {
    return Promise.resolve(legacyUserRepository.findByEmail(playerIdOrEmail))
    .then((user) => user ||
      playerRepository.findById(playerIdOrEmail).then((player) => player &&
        legacyUserRepository.findByUsername(player.playerName)
      )
    )
  }

  function authenticate (playerIdOrEmail, password) {
    return findLegacyUser(playerIdOrEmail)
    .then((user) => {
      if (!user) return false
      return bcrypt.compare(password, user.hashedPassword).then((result) =>
        result && user
      )
    })
  }
}

module.exports = createApiServer
