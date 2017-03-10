const MongoDBRepositoryFactory = require('./MongoDBRepositoryFactory')
const { MongoClient } = require('mongodb')
const axios = require('axios')
const log4js = require('log4js')

function requiredEnv (key) {
  const value = process.env[key]
  if (!value) throw new Error(`Required environment variable: ${key}`)
  return value
}
exports.config = {
  'config:legacyUser:apiKey': {
    create: () => requiredEnv('LEGACY_USER_API_KEY')
  },
  'config:mongodb:url': {
    create: () => {
      const DEFAULT_MONGO_URL = 'mongodb://127.0.0.1:27017/bemuse'
      return process.env.MONGO_URL || process.env.MONGODB_URI || DEFAULT_MONGO_URL
    }
  },
  'config:jwt:certificateUrl': {
    create: () => requiredEnv('JWT_CERTIFICATE_URL')
  }
}

exports.logger = {
  'logger:http': {
    create: () => log4js.getLogger('http')
  }
}

exports.authentication = {
  'authentication:jwt:certificate': {
    create: ({ certificateUrl }) => (
      axios.get(certificateUrl).then(response => response.data)
    ),
    dependencies: { certificateUrl: 'config:jwt:certificateUrl' }
  },
  'authentication:userTokenValidator': {
    create: require('./createTokenValidator'),
    dependencies: { certificate: 'authentication:jwt:certificate' }
  }
}

exports.database = {
  'database:mongodb': {
    create: ({ url }) => MongoClient.connect(url),
    dependencies: {
      url: 'config:mongodb:url'
    }
  }
}

exports.repository = {
  'repository:factory': {
    create: ({ db }) => new MongoDBRepositoryFactory({ db }),
    dependencies: { db: 'database:mongodb' }
  },
  'repository:legacyUser': {
    create: ({ factory }) => factory.createLegacyUserRepository(),
    dependencies: { factory: 'repository:factory' }
  },
  'repository:rankingEntry': {
    create: ({ factory }) => factory.createRankingEntryRepository(),
    dependencies: { factory: 'repository:factory' }
  },
  'repository:player': {
    create: ({ factory }) => factory.createPlayerRepository(),
    dependencies: { factory: 'repository:factory' }
  }
}

exports.api = {
  'api:legacyUserApi': {
    create: require('./createLegacyUserApi'),
    dependencies: {
      legacyUserApiKey: 'config:legacyUser:apiKey',
      legacyUserRepository: 'repository:legacyUser',
      playerRepository: 'repository:player'
    }
  },
  'api:graphql:root': {
    create: require('./createRoot'),
    dependencies: {
      rankingEntryRepository: 'repository:rankingEntry',
      legacyUserRepository: 'repository:legacyUser',
      playerRepository: 'repository:player',
      tokenValidator: 'authentication:userTokenValidator'
    }
  },
  'api:app': {
    create: require('./createApiServer'),
    dependencies: {
      logger: 'logger:http',
      legacyUserApi: 'api:legacyUserApi',
      graphqlRoot: 'api:graphql:root'
    }
  }
}
