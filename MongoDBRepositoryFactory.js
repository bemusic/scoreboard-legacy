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
        findUser (usernameOrEmail) {
          return (db
            .collection('LegacyUser')
            .find({
              $or: [
                { email: usernameOrEmail },
                { username: usernameOrEmail }
              ]
            })
            .limit(1)
            .toArray()
            .then((result) => result[0])
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
