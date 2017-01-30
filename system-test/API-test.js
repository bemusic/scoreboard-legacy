const assert = require('assert')
const { step, action } = require('prescript')
const { graphql } = require('./lib/common')

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

  step('Query flicknote', () => graphql(`query { player(name: "flicknote") { id, linked } }`))
  step('id should be correct', () => action(state => {
    assert.deepEqual(state.response.data, {
      data: {
        player: {
          id: state.playerId,
          linked: false
        }
      }
    })
  }))

  step('Link account', () => graphql(`mutation { linkPlayer(jwt: "a") { id, linked } }`))
  step('id should be correct', () => action(state => {
    assert.deepEqual(state.response.data, {
      data: {
        linkPlayer: {
          id: state.playerId,
          linked: true
        }
      }
    })
  }))
})
