
const { buildSchema } = require('graphql')
const graphqlHTTP = require('express-graphql')
const log4js = require('log4js')
const MongoClient = require('mongodb').MongoClient
const express = require('express')
const Promise = require('bluebird')

const schema = buildSchema(`
  # Query stuff from Bemuse internet ranking system here!
  type Query {
    # Query a chart by its MD5.
    chart(md5: String!): Chart

    # The current player.
    me: Self
  }

  # The current player.
  type Self {
    # Queries my own record of charts.
    records(ids: [String]): [RankingEntry]
  }

  # A notechart (.bms, .bmson) file, identified by its file hash (MD5).
  # In Bemuse, different play mode is a different Level and thus has a
  # different scoreboard.
  type Chart {
    # Query a level by play mode (KB or BM).
    level(playMode: String!): Level
  }

  # A Level is identified by a chart’s hash and its play mode.
  # Each Level has its own scoreboard.
  type Level {
    # A leaderboard associated with this level.
    leaderboard(max: Int): [LeaderboardRow]
  }

  # A leaderboard row
  type LeaderboardRow {
    # The ranking.
    rank: Int!

    # The ranking entry.
    entry: RankingEntry!
  }

  # A ranked entry in the leaderboard.
  type RankingEntry {
    # An internal ID used by the internet ranking system.
    id: String!

    # The chart’s MD5 hash.
    md5: String!

    # The play mode.
    playMode: String!

    # The score (ranges from 0–555555).
    score: Int!

    # Total number of notes (long note head and tail counted as separate note).
    total: Int!

    # The maximum combo attained.
    combo: Int!

    # An array of [Meticulous, Precise, Good, Offbeat, Missed] count.
    count: [Int]

    # A string representing the replay.
    log: String

    # Total number of plays for this level.
    playCount: Int!

    # The play number (out of playCount) for this particular score.
    playNumber: Int!

    # The name of the player.
    playerName: String!
  }
`)

function main () {
  return Promise.coroutine(function * () {
    const DEFAULT_MONGO_URL = 'mongodb://127.0.0.1:27017/bemuse'
    const db = yield connectMongo(process.env.MONGO_URL || DEFAULT_MONGO_URL)
    const port = +process.env.PORT || 8008
    const root = createRoot({ db })
    runGraphQLServer(port, root)
  })()
}

function createRoot ({ db }) {
  return {
    chart ({ md5 }) {
      return {
        level ({ playMode }) {
          return {
            leaderboard ({ max }) {
              return (db
                .collection('GameScore')
                .find({ md5: md5, playMode: playMode })
                .sort([ [ 'score', -1 ] ])
                .limit(Math.max(1, Math.min(max || 50, 50)))
                .toArray()
                .then((result) => result.map(toHighScoreObject))
              )
            }
          }
        }
      }
    },
    me: () => Promise.reject(new Error('Not implemented yet~'))
  }
}

function toHighScoreObject (doc, index) {
  return {
    rank: index + 1,
    entry: {
      id: String(doc._id),
      md5: doc.md5,
      playMode: doc.playMode,
      score: doc.score,
      total: doc.total,
      combo: doc.combo,
      count: doc.count,
      log: doc.log,
      playNumber: doc.playNumber,
      playCount: doc.playCount,
      playerName: doc.playerName
    }
  }
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
