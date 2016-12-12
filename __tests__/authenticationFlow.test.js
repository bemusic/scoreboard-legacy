/* eslint-env jest */
const Promise = require('bluebird')
const authenticationFlow = require('../authenticationFlow')

describe('Bemuse authentication flow...', () => {
  describe('legacy user', () => {
    function createEnvWithLegacyUser () {
      const env = createEnv()
      env.givenLegacyUser('flicknote', 'flicknote@bemuse.ninja', 'pwd')
      env.givenPlayer('flicknote')
      return env
    }
    it('can authenticate with username and password', () => {
      const env = createEnvWithLegacyUser()
      env.loginByUsernamePassword('flicknote', 'pwd').mustSucceed()
      return env.verify()
    })
    it('can authenticate with email and password', () => {
      const env = createEnvWithLegacyUser()
      env.loginByUsernamePassword('flicknote@bemuse.ninja', 'pwd').mustSucceed()
      return env.verify()
    })
    it('cannot authenticate with email if password is wrong', () => {
      const env = createEnvWithLegacyUser()
      env.loginByUsernamePassword('flicknote', 'pwdz').mustFail()
      return env.verify()
    })
    it('cannot authenticate with username if password is wrong', () => {
      const env = createEnvWithLegacyUser()
      env.loginByUsernamePassword('flicknote@bemuse.ninja', 'pwdz').mustFail()
      return env.verify()
    })
    it('cannot authenticate if unknown player', () => {
      const env = createEnvWithLegacyUser()
      env.loginByUsernamePassword('meow', 'pwd').mustFail()
      return env.verify()
    })
  })

  xdescribe('sign up', () => {
    it('can sign up as new user', () => {
      const env = createEnv()
      env.signUp('DJTHAI', 'thai@bemuse.ninja', 'strongpassword').mustSucceed()
      env.loginByUsernamePassword('DJTHAI', 'strongpassword').mustSucceed()
      env.loginByUsernamePassword('thai@bemuse.ninja', 'strongpassword').mustSucceed()
      return env.verify()
    })
  })

  function createEnv () {
    const legacyUserByUsername = { }
    const legacyUserByEmail = { }
    const playerByPlayerName = { }
    const playerById = { }
    const actions = [ ]
    let nextPlayerId = 0

    function queue (action) {
      actions.push(action)
    }

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
      verify () {
        return Promise.coroutine(function * () {
          for (const action of actions) yield Promise.resolve(action())
        })()
      },
      signUp (username, email, password) {
        let result
        queue(() => (
          Promise.coroutine(authenticationFlow.signUp)(
            username, email, password, { }
          )
          .then((_result) => { result = _result })
        ))
        return {
          mustSucceed () {
            queue(() => {
              if (!result.idToken) {
                throw new Error('Error: ' + result.error)
              }
            })
          },
          mustFail () {
            queue(() => {
              expect(result.error).toBeTruthy()
            })
          }
        }
      },
      loginByUsernamePassword (username, password) {
        let result
        queue(() => (
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
          .then((_result) => { result = _result })
        ))
        return {
          mustSucceed () {
            queue(() => {
              if (!result.idToken) {
                throw new Error('Error: ' + result.error)
              }
            })
          },
          mustFail () {
            queue(() => {
              expect(result.error).toBeTruthy()
            })
          }
        }
      }
    }
  }
})
