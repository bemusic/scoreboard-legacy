const MongoClient = require('mongodb').MongoClient
const Promise = require('bluebird')
const log4js = require('log4js')

console.log('Parse user migration script...')

const fromUrl = process.argv[2]
const toUrl = process.argv[3]

if (!fromUrl) throw new Error('Supply source database url')
if (!toUrl) throw new Error('Supply target database url')

const logger = log4js.getLogger('parse-migration')

Promise.coroutine(function * () {
  logger.info('Connecting to Parse DB...')
  const parseDb = yield MongoClient.connect(fromUrl)
  logger.info('Connecting to scoreboard DB...')
  const scoreboardDb = yield MongoClient.connect(toUrl)
  logger.info('Connected to em all!!')

  {
    const latestTimestamp = yield * getLatestTimestampInScoreboardDb()
    const updatedThreshold = new Date(latestTimestamp)
    logger.info('Latest timestamp in scoreboard DB', updatedThreshold.toString())
    const usersToMigrateCursor = parseDb.collection('_User')
      .find({ _updated_at: { $gte: new Date(latestTimestamp) } })
      .sort({ _updated_at: 1 })
      .batchSize(50)
    const totalCount = yield usersToMigrateCursor.count()
    logger.info('Users to migrate in this round: ', totalCount)

    let i = 0
    while (yield usersToMigrateCursor.hasNext()) {
      const inDoc = yield usersToMigrateCursor.next()
      const outDoc = convertParseUserToScoreboardLegacyUser(inDoc)
      const num = ++i
      const result = yield scoreboardDb.collection('LegacyUser')
        .replaceOne({ _id: outDoc._id }, outDoc, { upsert: true })
      const replaced = result.upsertedCount === 0
      logger.info(
        (replaced ? 'Updated' : 'Migrated'),
        'user', num, 'out of', totalCount,
        '(' + outDoc.username + ')',
        'playCount=' + inDoc.playCount,
        'grandTotalScore=' + inDoc.grandTotalScore
      )
    }
    logger.info('Done migrating users.')
  }

  function convertParseUserToScoreboardLegacyUser (parseUser) {
    return {
      _id: parseUser._id,
      updatedAt: parseUser._updated_at,
      createdAt: parseUser._created_at,
      username: parseUser.username,
      email: parseUser.email,
      emailVerified: parseUser.emailVerified,
      hashedPassword: parseUser._hashed_password
    }
  }

  function * getLatestTimestampInScoreboardDb () {
    const latest = yield * getMaxValueFrom(scoreboardDb, 'LegacyUser', 'updatedAt')
    return +latest || 0
  }

  function * getMaxValueFrom (db, collectionName, fieldName) {
    const [ item ] = yield scoreboardDb.collection(collectionName)
      .find({ }, { [fieldName]: true })
      .sort({ [fieldName]: -1 })
      .limit(1)
      .toArray()
    return item && item[fieldName]
  }
})().done()
