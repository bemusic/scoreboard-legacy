const uuid = require('uuid')

module.exports = MongoDBRepositoryFactory

function MongoDBRepositoryFactory ({ db }) {
  return {
    createRankingEntryRepository () {
      return {
        fetchLeaderboardEntries ({ md5, playMode, max }) {
          return (db
            .collection('GameScore')
            .find({ md5: md5, playMode: playMode })
            .sort([ [ 'score', -1 ] ])
            .limit(Math.max(1, Math.min(max || 50, 50)))
            .toArray()
            .then((result) => result.map(toRankingEntry))
          )
        }
      }
    },
    createLegacyUserRepository () {
      return {
        findByEmail (email) {
          return (db
            .collection('LegacyUser')
            .find({ email: email })
            .limit(1)
            .toArray()
            .then((result) => result[0])
          )
        },
        findByUsername (username) {
          return (db
            .collection('LegacyUser')
            .find({ username: username })
            .limit(1)
            .toArray()
            .then((result) => result[0])
          )
        }
      }
    },
    createPlayerRepository () {
      const playerCollection = db.collection('Player')
      playerCollection.createIndex(
        { playerName: 1 },
        { unique: true }
      )
      return {
        findByName (playerName) {
          return (playerCollection
            .find({ playerName: playerName }, { _id: 1 })
            .limit(1)
            .toArray()
            .then((result) => result[0])
          )
        },
        register (playerName) {
          const playerId = uuid.v4()
          return (playerCollection
            .insertOne({ _id: playerId, playerName: playerName })
            .then((result) => playerId)
          )
        }
      }
    }
  }
}

function toRankingEntry (doc) {
  return {
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
