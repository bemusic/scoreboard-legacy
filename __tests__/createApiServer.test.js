/* eslint-env jest */

const createApiServer = require('../createApiServer')
const request = require('supertest')

describe('The API server', () => {
  describe('legacy users', () => {
    const API_KEY = '__dummy_api_key__'
    const DUMMY_USER = {
      username: 'ABC',
      email: 'abc@test.test',
      hashedPassword: '$2a$08$slf.HjrpyEjFgg/HvVW0FuWzCoRNI8eW0Ei4PM.5o6ImHt7lA/Xze'
    }
    let app

    beforeAll(() => {
      app = createApiServer({
        legacyUserApiKey: API_KEY,
        legacyUserRepository: {
          findUser (usernameOrEmail) {
            if (usernameOrEmail === DUMMY_USER.username) {
              return Promise.resolve(DUMMY_USER)
            }
            if (usernameOrEmail === DUMMY_USER.email) {
              return Promise.resolve(DUMMY_USER)
            }
            return Promise.resolve(null)
          }
        }
      })
    })

    it('can authenticate', () => {
      return request(app)
        .post('/legacyusers/check')
        .type('form').send({ usernameOrEmail: 'ABC', password: 'meow', apiKey: API_KEY })
        .expect(200)
    })

    it('returns 401 if user not found', () => {
      return request(app)
        .post('/legacyusers/check')
        .type('form').send({ usernameOrEmail: 'ABCX', password: 'meow', apiKey: API_KEY })
        .expect(401)
    })

    it('returns 401 if user password incorrect', () => {
      return request(app)
        .post('/legacyusers/check')
        .type('form').send({ usernameOrEmail: 'ABC', password: 'meoww', apiKey: API_KEY })
        .expect(401)
    })

    it('returns 400 if bad api key', () => {
      return request(app)
        .post('/legacyusers/check')
        .type('form').send({ usernameOrEmail: 'ABC', password: 'meow', apiKey: 'bad' })
        .expect(400)
    })
  })
})
