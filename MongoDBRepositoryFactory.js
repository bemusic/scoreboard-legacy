const uuid = require('uuid')

module.exports = MongoDBRepositoryFactory

function MongoDBRepositoryFactory ({ db }) {
  return {
    createRankingEntryRepository () {
      const rankingEntryCollection = db.collection('RankingEntry')
      rankingEntryCollection.createIndex({ md5: 1, playMode: 1, playerId: 1 }, { unique: true })
      return {
        fetchLeaderboardEntries ({ md5, playMode, max }) {
          return (rankingEntryCollection
            .find({ md5: String(md5), playMode: String(playMode) })
            .sort([ [ 'data.score', -1 ] ])
            .limit(Math.max(1, Math.min(+max || 50, 50)))
            .toArray()
          )
        },
        fetchPlayerEntries ({ md5s, playerId }) {
          return (rankingEntryCollection
            .find({ md5: { $in: md5s.map(x => String(x)) }, playerId: String(playerId) })
            .toArray()
          )
        },
        fetchLeaderboardEntry ({ md5, playMode, playerId }) {
          return (rankingEntryCollection
            .find({ md5: String(md5), playMode: String(playMode), playerId: String(playerId) })
            .limit(1)
            .toArray()
            .then((result) => result[0] || null)
          )
        },
        saveLeaderboardEntry ({ md5, playMode, playerId, data }) {
          return (rankingEntryCollection
            .updateOne(
              { md5: String(md5), playMode: String(playMode), playerId: String(playerId) },
              { $set: { data: data, updatedAt: new Date() } },
              { upsert: true }
            )
          )
        },
        calculateRank ({ md5, playMode, score }) {
          return (rankingEntryCollection
            .count({
              md5: String(md5),
              playMode: String(playMode),
              'data.score': { $gt: +score }
            })
            .then(count => count + 1)
          )
        }
      }
    },
    createLegacyUserRepository () {
      return {
        findByEmail (email) {
          return (db
            .collection('LegacyUser')
            .find({ email: String(email) })
            .limit(1)
            .toArray()
            .then((result) => result[0])
          )
        },
        findByUsername (username) {
          return (db
            .collection('LegacyUser')
            .find({ username: String(username) })
            .limit(1)
            .toArray()
            .then((result) => result[0])
          )
        }
      }
    },
    createPlayerRepository () {
      const playerCollection = db.collection('Player')
      playerCollection.createIndex({ playerName: 1 }, { unique: true })
      playerCollection.createIndex({ linkedTo: 1 })
      return {
        findByName (playerName) {
          return (playerCollection
            .find({ playerName: String(playerName) })
            .limit(1)
            .toArray()
            .then((result) => result[0])
          )
        },
        findById (playerId) {
          return (playerCollection
            .find({ _id: String(playerId) })
            .limit(1)
            .toArray()
            .then((result) => result[0])
          )
        },
        findByUserId (userId) {
          return (playerCollection
            .find({ linkedTo: String(userId) })
            .limit(1)
            .toArray()
            .then((result) => result[0])
          )
        },
        register (playerName) {
          const playerId = uuid.v4()
          return (playerCollection
            .insertOne({ _id: playerId, playerName: String(playerName) })
            .then((result) => playerId)
          )
        },
        saveLink (playerId, userId) {
          return (playerCollection
            .updateOne(
              { _id: String(playerId) },
              { $set: { linkedTo: String(userId) } }
            )
            .then((result) => null)
          )
        }
      }
    }
  }
}
