module.exports = createRoot

function createRoot ({ rankingEntryRepository }) {
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
    me: () => Promise.reject(new Error('Not implemented yet~'))
  }
}

function rank (entries) {
  return entries.map((entry, index) => ({ rank: index + 1, entry }))
}
