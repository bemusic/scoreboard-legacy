const co = require('co')
const yock = require('../yock')
const configuration = require('../configuration')
const ScoreData = require('../ScoreData')

const mongoDbUrl = process.argv[2]
const legacyScoreboardData = require(require('fs').realpathSync(process.argv[3]))

console.log('* MongoDB URL:', mongoDbUrl)
console.log('* Scores to import:', legacyScoreboardData.length)

const configLayer = {
  'config:mongodb:url': {
    create: () => mongoDbUrl
  }
}

const appLayer = {
  'app:importer': {
    create: createImporter,
    dependencies: {
      playerRepository: 'repository:player',
      rankingEntryRepository: 'repository:rankingEntry'
    }
  }
}

const services = Object.assign({ }, ...[
  configLayer,
  configuration.logger,
  configuration.database,
  configuration.repository,
  appLayer
])

co(function * () {
  const container = yock(services)
  const importer = yield container.get('app:importer')
  yield importer.import()
})
.catch(e => setTimeout(() => { throw e }))

function createImporter ({ playerRepository, rankingEntryRepository }) {
  const playerIdCache = new Map()
  const importer = {
    import () {
      return co(function * () {
        let i = 0
        const totalLength = legacyScoreboardData.length
        for (const data of legacyScoreboardData) {
          const { md5, playMode, playerName } = data
          const { playerId, actionTaken: playerActionTaken } = yield * (function * () {
            if (playerIdCache.has(playerName)) {
              return { playerId: playerIdCache.get(playerName), actionTaken: 'Cached' }
            }
            const player = yield playerRepository.findByName(playerName)
            if (player) {
              return { playerId: player._id, actionTaken: 'Player found' }
            }
            const registeredPlayerId = yield playerRepository.register(playerName)
            return { playerId: registeredPlayerId, actionTaken: 'Registered' }
          })()
          playerIdCache.set(playerName, playerId)
          const scoreData = ScoreData.update(null, {
            total: data.total,
            count: data.count,
            score: data.score,
            combo: data.combo
          })
          scoreData.recordedAt = new Date(data.recordedAt)
          scoreData.playCount = data.playCount
          scoreData.playNumber = data.playNumber
          yield rankingEntryRepository.saveLeaderboardEntry({ md5, playMode, playerId, data: scoreData })
          console.log(`${++i}/${totalLength} "${playerName}" (${playerActionTaken} => ${playerId}) [${md5} ${playMode}]`)
        }
      })
    }
  }
  return importer
}
