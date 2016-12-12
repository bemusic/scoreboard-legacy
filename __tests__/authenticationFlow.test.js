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

  describe('sign up with username, email and password', () => {
    xit('can sign up as new user', () => {
      const env = createEnv()
      env.signUp('DJTHAI', 'thai@bemuse.ninja', 'strongpassword').mustSucceed()
      env.loginByUsernamePassword('DJTHAI', 'strongpassword').mustSucceed()
      env.loginByUsernamePassword('thai@bemuse.ninja', 'strongpassword').mustSucceed()
      return env.verify()
    })
    it('cannot sign up if legacy user already exist', () => {
      const env = createEnv()
      env.givenLegacyUser('DJTHAI', 'thai@another.place', 'wow')
      env.signUp('DJTHAI', 'thai@bemuse.ninja', 'strongpassword').mustFail()
      return env.verify()
    })
    it('cannot sign up if email already exist as legacy user', () => {
      const env = createEnv()
      env.givenLegacyUser('THAI', 'thai@bemuse.ninja', 'wow')
      env.givenPlayer('THAI')
      env.signUp('DJTHAI', 'thai@bemuse.ninja', 'strongpassword').mustFail()
      return env.verify()
    })
  })

  describe('edge cases', () => {
    describe('hijacking user by creating account with existing player id as username', () => {
      it('should be prevented', () => {
        const env = createEnv()
        env.givenLegacyUser('THAI', 'thai@bemuse.ninja', 'wow')
        env.givenPlayer('THAI')
        env.externalSignUp('player0', 'player0@bemuse.ninja', 'strongpassword').mustFail()
        return env.verify()
      })
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
          return Promise.resolve((() => {
            const user = userByEmail[username] || userByUsername[username] || (() => {
              // Try to register using our custom script.
              const result = databaseLogIn(username, password)
              if (result) {
                const newUser = { username, email: result.email, password }
                register(newUser)
                return newUser
              }
            })()
            if (!user) return { error: 'no user' }
            if (user.password !== password) return { error: 'wrong password' }
            const idToken = { validToken: true, userId: user._id, email: user.email }
            return { idToken: idToken }
          })())
        },
        signUp (username, email, password) {
          return Promise.resolve((() => {
            if (userByUsername[username]) return { error: 'username duplicate' }
            if (userByEmail[username]) return { error: 'email duplicate' }
            if (databaseGetUser(email)) return { error: 'database user conflict email' }
            if (databaseGetUser(username)) return { error: 'database user conflict name' }
            const user = { username, email, password }
            register(user)
            return { userId: user._id }
          })())
        }
      }

      function register (user) {
        user._id = 'u' + (nextUserId++)
        userByUsername[user.username] = user
        userByEmail[user.email] = user
      }

      // Our custom code that we host at Auth0
      function databaseLogIn (username, password) {
        const user = legacyUserByEmail[username] || (() => {
          const player = playerById[username]
          return player && legacyUserByUsername[player.playerName]
        })()
        if (user.password === password) {
          return user
        }
        return null
      }

      function databaseGetUser (username) {
        const user = legacyUserByEmail[username] || (() => {
          const player = playerById[username]
          return player && legacyUserByUsername[player.playerName]
        })()
        return user
      }
    })()

    function registerPlayer (playerName) {
      const _id = 'player' + (nextPlayerId++)
      const player = { playerName, _id }
      playerByPlayerName[playerName] = player
      playerById[_id] = player
      return player
    }

    return {
      givenLegacyUser (username, email, password) {
        const user = { username, email, password }
        legacyUserByUsername[username] = user
        legacyUserByEmail[email] = user
      },
      givenPlayer (playerName) {
        registerPlayer(playerName)
      },
      verify () {
        return Promise.coroutine(function * () {
          for (const action of actions) yield Promise.resolve(action())
        })()
      },
      externalSignUp (username, email, password) {
        let result
        queue(() => externalProvider.signUp(username, email, password)
          .then((_result) => { result = _result })
        )
        return {
          mustFail () {
            queue(() => {
              expect(result.error).toBeTruthy()
            })
          }
        }
      },
      signUp (username, email, password) {
        let result
        queue(() => (
          Promise.coroutine(authenticationFlow.signUp)(
            username, email, password, {
              checkPlayerNameAvailability (playerName) {
                if (legacyUserByUsername[playerName]) {
                  return Promise.resolve(false)
                }
                const player = !playerByPlayerName[playerName]
                if (!player) return Promise.resolve(true)
                if (player.linked) return Promise.resolve(false)
                return Promise.resolve(true)
              },
              userSignUp (username, email, password) {
                return externalProvider.signUp(username, email, password)
              },
              reservePlayerId (playerName) {
                const player = playerByPlayerName[playerName] || registerPlayer(playerName)
                return Promise.resolve(player._id)
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
      },
      loginByUsernamePassword (username, password) {
        let result
        queue(() => (
          Promise.coroutine(authenticationFlow.loginByUsernamePassword)(
            username, password, {
              log: () => { },
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
