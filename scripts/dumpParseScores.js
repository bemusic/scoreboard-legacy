const MongoClient = require('mongodb').MongoClient
const Promise = require('bluebird')
const log4js = require('log4js')

console.log('Parse scoreboard dump...')

const fromUrl = process.argv[2]
if (!fromUrl) throw new Error('Supply source database url')

const logger = log4js.getLogger('dumpParseScores')

Promise.coroutine(function * () {
  logger.info('Connecting to Parse DB...')
  const parseDb = yield MongoClient.connect(fromUrl)
  const cursor = parseDb.collection('GameScore')
    .find({ })
    .sort({ _updated_at: 1 })
    .batchSize(50)

  const totalCount = yield cursor.count()
  logger.info('Scores to download: ', totalCount)

  let i = 0
  const output = [ ]
  while (yield cursor.hasNext()) {
    const inDoc = yield cursor.next()
    output.push(inDoc)
    console.log(++i + '/' + totalCount)
  }
  logger.info('Done downloading scores.')
  require('fs').writeFileSync('/tmp/scoreboard.json', JSON.stringify(output, null, 2))
})().done()
