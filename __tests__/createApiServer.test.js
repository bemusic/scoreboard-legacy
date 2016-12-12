/* eslint-env jest */

const createApiServer = require('../createApiServer')
const request = require('supertest')

describe('The API server', () => {
  describe('legacy users', () => {
    const API_KEY = '__dummy_api_key__'
    const DUMMY_USER = {
      _id: 'zzz',
      username: 'ABC',
      email: 'abc@test.test',
      createdAt: new Date(0),
      hashedPassword: '$2a$08$slf.HjrpyEjFgg/HvVW0FuWzCoRNI8eW0Ei4PM.5o6ImHt7lA/Xze'
    }
    const DUMMY_PLAYER = {
      _id: 'playerZ',
      playerName: 'ABC'
    }
    let app

    beforeAll(() => {
      app = createApiServer({
        legacyUserApiKey: API_KEY,
        playerRepository: {
          findByName: (playerName) => Promise.resolve(
            playerName === DUMMY_PLAYER.playerName ? DUMMY_PLAYER : null
          ),
          findById: (playerId) => Promise.resolve(
            playerId === DUMMY_PLAYER._id ? DUMMY_PLAYER : null
          )
        },
        legacyUserRepository: {
          findByEmail: (email) => Promise.resolve(
            email === DUMMY_USER.email ? DUMMY_USER : null
          ),
          findByUsername: (username) => Promise.resolve(
            username === DUMMY_USER.username ? DUMMY_USER : null
          )
        }
      })
    })

    describe('authentication', () => {
      it('can authenticate using player ID', () => {
        return request(app)
          .post('/legacyusers/check')
          .type('form').send({ playerIdOrEmail: 'playerZ', password: 'meow', apiKey: API_KEY })
          .expect(200)
      })

      it('can authenticate using email', () => {
        return request(app)
          .post('/legacyusers/check')
          .type('form').send({ playerIdOrEmail: 'abc@test.test', password: 'meow', apiKey: API_KEY })
          .expect(200)
      })

      describe('a successful request', () => {
        function successfulRequest () {
          return request(app)
            .post('/legacyusers/check')
            .type('form').send({ playerIdOrEmail: 'abc@test.test', password: 'meow', apiKey: API_KEY })
            .expect(200)
        }
        itContainsUserData(successfulRequest)
      })

      it('returns 401 if user not found', () => {
        return request(app)
          .post('/legacyusers/check')
          .type('form').send({ playerIdOrEmail: 'ABCX', password: 'meow', apiKey: API_KEY })
          .expect(401)
      })

      it('returns 401 if user password incorrect', () => {
        return request(app)
          .post('/legacyusers/check')
          .type('form').send({ playerIdOrEmail: 'abc@test.test', password: 'meoww', apiKey: API_KEY })
          .expect(401)
      })

      it('returns 400 if bad api key', () => {
        return request(app)
          .post('/legacyusers/check')
          .type('form').send({ playerIdOrEmail: 'abc@test.test', password: 'meow', apiKey: 'bad' })
          .expect(400)
      })
    })

    describe('get user', () => {
      it('can get using email', () => {
        return request(app)
          .post('/legacyusers/get')
          .type('form').send({ email: 'abc@test.test', apiKey: API_KEY })
          .expect(200)
      })

      describe('a successful request', () => {
        function successfulRequest () {
          return request(app)
            .post('/legacyusers/get')
            .type('form').send({ email: 'abc@test.test', apiKey: API_KEY })
            .expect(200)
        }
        itContainsUserData(successfulRequest)
      })

      it('returns 404 if user not found', () => {
        return request(app)
          .post('/legacyusers/get')
          .type('form').send({ email: 'xyz@test.test', apiKey: API_KEY })
          .expect(404)
      })

      it('returns 400 if bad api key', () => {
        return request(app)
          .post('/legacyusers/get')
          .type('form').send({ email: 'abc@test.test', apiKey: 'bad' })
          .expect(400)
      })
    })

    function itContainsUserData (successfulRequest) {
      it('returns email', () => {
        return successfulRequest().expect(/"email":"abc@test.test"/)
      })
      it('returns username', () => {
        return successfulRequest().expect(/"username":"ABC"/)
      })
      xit('returns player Id', () => {
        return successfulRequest().expect(/"playerId":"playerZ"/)
      })
      it('returns parse ID', () => {
        return successfulRequest().expect(/"_id":"zzz"/)
      })
      it('returns created at', () => {
        return successfulRequest().expect(/"createdAt":"1970-/)
      })
    }
  })
})
