const assert = require('assert')
const { step, action } = require('prescript')
const { graphql } = require('./lib/common')

step('Register players', () => {
  step('Register flicknote', () => graphql(`mutation { registerPlayer(name: "flicknote") { id } }`))
  step('Link account flicknote', () => graphql(`mutation { linkPlayer(jwt: "valid.flicknote.a") { id, linked } }`))

  step('Register dtinth', () => graphql(`mutation { registerPlayer(name: "dtinth") { id } }`))
  step('Link account dtinth', () => graphql(`mutation { linkPlayer(jwt: "valid.dtinth.b") { id, linked } }`))
})

step('Save flicknote score', () => graphql(`mutation {
  registerScore(
    jwt: "valid.flicknote.a",
    md5: "01234567012345670123456701234567",
    playMode: "BM",
    input: {
      score: 400000,
      combo: 50,
      total: 150,
      count: [ 10, 20, 30, 40, 50 ],
      log: "ABCX"
    }
  ) {
    resultingRow { rank, entry { id, playCount, score, combo, count, player { name } } }
    level { leaderboard { rank, entry { id, score, combo, count, player { name } } } }
  }
}`))

step('Save dtinth score', () => graphql(`mutation {
  registerScore(
    jwt: "valid.dtinth.b",
    md5: "01234567012345670123456701234567",
    playMode: "BM",
    input: {
      score: 300000,
      combo: 50,
      total: 150,
      count: [ 10, 20, 30, 40, 50 ],
      log: "ABCX"
    }
  ) {
    resultingRow { rank, entry { id, playCount, score, combo, count, player { name } } }
    level { leaderboard { rank, entry { id, score, combo, count, player { name } } } }
  }
}`))
step('Verify result', () => action(state => {
  const { data } = state.response.data
  assert.equal(data.registerScore.resultingRow.rank, 2)
  assert.equal(data.registerScore.resultingRow.entry.playCount, 1)
}))
