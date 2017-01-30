const express = require('express')
const bcrypt = require('bcrypt')

module.exports = function createLegacyUserApi ({
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
