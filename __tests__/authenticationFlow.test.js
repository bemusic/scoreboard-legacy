/* eslint-env jest */
const Promise = require('bluebird')
const authenticationFlow = require('../authenticationFlow')

describe('Bemuse authentication flow...', () => {
  describe('legacy user', () => {
    it('can authenticate with username and password', () => {
      const env = createEnv()
      env.givenLegacyUser('flicknote', 'flicknote@bemuse.ninja', 'pwd')
      env.givenPlayer('flicknote')
      return env.loginByUsernamePassword('flicknote', 'pwd').mustSucceed()
    })
    it('can authenticate with email and password', () => {
      const env = createEnv()
      env.givenLegacyUser('flicknote', 'flicknote@bemuse.ninja', 'pwd')
      env.givenPlayer('flicknote')
      return env.loginByUsernamePassword('flicknote@bemuse.ninja', 'pwd').mustSucceed()
    })
    it('cannot authenticate with email if password is wrong', () => {
      const env = createEnv()
      env.givenLegacyUser('flicknote', 'flicknote@bemuse.ninja', 'pwd')
      env.givenPlayer('flicknote')
      return env.loginByUsernamePassword('flicknote', 'pwdz').mustFail()
    })
    it('cannot authenticate with username if password is wrong', () => {
      const env = createEnv()
      env.givenLegacyUser('flicknote', 'flicknote@bemuse.ninja', 'pwd')
      env.givenPlayer('flicknote')
      return env.loginByUsernamePassword('flicknote@bemuse.ninja', 'pwdz').mustFail()
    })
    it('cannot authenticate if unknown player', () => {
      const env = createEnv()
      env.givenLegacyUser('flicknote', 'flicknote@bemuse.ninja', 'pwd')
      env.givenPlayer('flicknote')
      return env.loginByUsernamePassword('meow', 'pwd').mustFail()
    })
  })

  function createEnv () {
    const legacyUserByUsername = { }
    const legacyUserByEmail = { }
    const playerByPlayerName = { }
    const playerById = { }
    let nextPlayerId = 0

    // This is Auth0.
    const externalProvider = (() => {
      const userByUsername = { }
      const userByEmail = { }
      let nextUserId = 0
      return {
        login (username, password) {
          const user = userByEmail[username] || userByUsername[username] || (() => {
            // Try to register using our custom script.
            console.log('Trigger database login', username)
            const result = databaseLogIn(username, password)
            if (result) {
              const newUser = { username, email: result.email, password }
              register(newUser)
              return newUser
            }
          })()
          if (!user) {
            return Promise.resolve({ error: 'no user' })
          }
          if (user.password !== password) {
            return Promise.resolve({ error: 'wrong password' })
          }
          return Promise.resolve({
            idToken: { validToken: true, userId: user._id, email: user.email }
          })
        }
      }

      function register (user) {
        user._id = 'u' + (nextUserId++)
        userByUsername[user.username] = user
        userByEmail[user.email] = user
      }

      // Our custom that we host at Auth0
      function databaseLogIn (username, password) {
        const user = legacyUserByEmail[username] || (() => {
          console.log('Custom DB: Looking for player with ID', username)
          const player = playerById[username]
          return player && legacyUserByUsername[player.playerName]
        })()
        if (user.password === password) {
          return user
        }
        return null
      }
    })()

    return {
      givenLegacyUser (username, email, password) {
        const user = { username, email, password }
        legacyUserByUsername[username] = user
        legacyUserByEmail[email] = user
      },
      givenPlayer (playerName) {
        const _id = 'player' + (nextPlayerId++)
        const player = { playerName, _id }
        playerByPlayerName[playerName] = player
        playerById[_id] = player
      },
      loginByUsernamePassword (username, password) {
        const run = () => (
          Promise.coroutine(authenticationFlow.loginByUsernamePassword)(
            username, password, {
              usernamePasswordLogin (username, password) {
                return externalProvider.login(username, password)
              },
              resolvePlayerId (playerName) {
                const result = playerByPlayerName[playerName]
                return Promise.resolve(result
                  ? { playerId: result._id }
                  : { error: 'no found' }
                )
              }
            }
          )
        )
        return {
          mustSucceed () {
            return run().then((result) => {
              if (!result.idToken) {
                throw new Error('Error: ' + result.error)
              }
            })
          },
          mustFail () {
            return run().then((result) => {
              expect(result.error).toBeTruthy()
            })
          }
        }
      }
    }
  }
})
