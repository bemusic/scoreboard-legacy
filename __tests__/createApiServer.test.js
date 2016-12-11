/* eslint-env jest */

const createApiServer = require('../createApiServer')
const request = require('supertest')

describe('The API server', () => {
  describe('legacy users', () => {
    const API_KEY = '__dummy_api_key__'
    let app

    beforeAll(() => {
      app = createApiServer({
        legacyUserApiKey: API_KEY,
        legacyUserRepository: {
          findUser (email) {
            return { username: 'ABC', email: 'abc@test.test', hashedPassword: 'meow' }
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

    xit('returns 401 if user not found', () => {
      return request(app)
        .post('/legacyusers/check')
        .type('form').send({ usernameOrEmail: 'ABCX', password: 'meow', apiKey: API_KEY })
        .expect(401)
    })

    xit('returns 401 if user password incorrect', () => {
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
