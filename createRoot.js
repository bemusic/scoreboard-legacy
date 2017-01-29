module.exports = createRoot

function createRoot ({
  rankingEntryRepository,
  legacyUserRepository,
  playerRepository
}) {
  return {
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
    me: () => Promise.reject(new Error('Not implemented yet~'))
  }

  function PublicPlayerData (player) {
    return {
      id: player._id,
      name: player.playerName,
      linked: false
    }
  }
}

function rank (entries) {
  return entries.map((entry, index) => ({ rank: index + 1, entry }))
}
