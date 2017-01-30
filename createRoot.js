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
    me: () => Promise.reject(new Error('Not implemented yet~'))
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
      score: entry.data.score,
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
