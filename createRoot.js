const ScoreData = require('./ScoreData')

module.exports = createRoot

function createRoot ({
  rankingEntryRepository,
  legacyUserRepository,
  playerRepository,
  tokenValidator
}) {
  const root = {
    chart ({ md5 }) {
      return {
        level ({ playMode }) {
          return {
            leaderboard ({ max }) {
              max = Math.max(1, Math.min(max || 50, 50))
              const options = { md5, playMode, max }
              return (rankingEntryRepository
                .fetchLeaderboardEntries(options)
                .then(rank)
              )
            }
          }
        }
      }
    },
    player ({ name }) {
      return playerRepository.findByName(name)
        .then(foundPlayer => {
          return foundPlayer || legacyUserRepository.findByUsername(name)
            .then(foundLegacyUser => {
              return foundLegacyUser && playerRepository.register(name)
                .then(() => playerRepository.findByName(name))
            })
        })
        .then(player => {
          return player && PublicPlayerData(player)
        })
    },
    registerPlayer ({ name }) {
      return playerRepository.findByName(name)
        .then(player => {
          return player || playerRepository.register(name)
            .then(() => playerRepository.findByName(name))
        })
        .then(player => {
          return player && PublicPlayerData(player)
        })
    },
    linkPlayer ({ jwt }) {
      return tokenValidator.validateToken(jwt)
        .then(tokenInfo => {
          const playerId = tokenInfo.playerId
          const userId = tokenInfo.userId
          return playerRepository.findById(playerId).then(player => {
            if (!player) throw new Error('Player with specified ID not found.')
            if (player.linkedTo && player.linkedTo !== userId) {
              throw new Error('Player linked to incorrect ID.')
            }
            return playerRepository.saveLink(playerId, userId).then(() => {
              return playerRepository.findById(playerId)
                .then(player => PublicPlayerData(player))
            })
          })
        })
    },
    registerScore ({ jwt, md5, playMode, input }) {
      return tokenValidator.validateToken(jwt)
        .then(tokenInfo => {
          const userId = tokenInfo.userId
          return playerRepository.findByUserId(userId).then(player => {
            if (!player) throw new Error('Player with specified user ID not found.')
            const playerId = player._id
            return rankingEntryRepository
              .fetchLeaderboardEntry({ md5, playMode, playerId })
              .then(existingEntry => {
                const existingData = existingEntry && existingEntry.data
                const nextData = ScoreData.update(existingData, input)
                return rankingEntryRepository
                  .saveLeaderboardEntry({ md5, playMode, playerId, data: nextData })
              })
              .then(() => {
                return rankingEntryRepository
                  .fetchLeaderboardEntry({ md5, playMode, playerId })
              })
              .then(entry => {
                return rankingEntryRepository
                  .calculateRank({ md5, playMode, playerId }, entry.data.score)
                  .then(rank => {
                    return {
                      resultingRow: { rank, entry: RankingEntry(entry) },
                      level: root.chart({ md5 }).level({ playMode })
                    }
                  })
              })
          })
        })
    }
  }

  function PublicPlayerData (player) {
    return {
      id: player._id,
      name: player.playerName,
      linked: !!player.linkedTo
    }
  }

  function RankingEntry (entry) {
    return {
      id: String(entry._id),
      score: entry.data.score,
      combo: entry.data.combo,
      count: entry.data.count,
      total: entry.data.total,
      playNumber: entry.data.playNumber,
      playCount: entry.data.playCount,
      player: () => playerRepository.findById(entry.playerId).then(player =>
        player && PublicPlayerData(player)
      )
    }
  }

  function rank (entries) {
    return entries.map((entry, index) => ({
      rank: index + 1,
      entry: RankingEntry(entry)
    }))
  }

  return root
}
