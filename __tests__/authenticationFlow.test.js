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
    it('should link the player after successful')
  })

  describe('sign up with username, email and password', () => {
    it('can sign up as new user', () => {
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
    it('should link the player after successful', () => {
      const env = createEnv()
      env.signUp('DJTHAI', 'thai@bemuse.ninja', 'strongpassword').mustSucceed()
      env.playerWithName('DJTHAI').shouldBeLinkedTo('thai@bemuse.ninja')
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
    describe('an unlinked account (somehow)', () => {
      it('should try to link with legacy user via email, if possible')
      it('should ask for player name and try to register')
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
  const externalProvider = createExternalAuthProvider({
    databaseLogIn (username, password) {
      const user = legacyUserByEmail[username] || (() => {
        const player = playerById[username]
        return player && legacyUserByUsername[player.playerName]
      })()
      const player = playerByPlayerName[user.username]
      if (user.password === password) {
        return { username: player._id, email: user.email }
      }
      return null
    },
    databaseGetUser (username) {
      const user = legacyUserByEmail[username] || (() => {
        const player = playerById[username]
        return player && legacyUserByUsername[player.playerName]
      })()
      return user
    },
    rule (user) {
      if (user.email && !user.playerName) {
        const player = link(user._id, user.username)
        user.playerId = player._id
        user.playerName = player.playerName
      }
    }
  })

  function link (userId, playerId) {
    const player = playerById[playerId]
    player.linkedTo = userId
    return player
  }

  function registerPlayer (playerName) {
    const _id = 'player' + (nextPlayerId++)
    const player = { playerName, _id }
    playerByPlayerName[playerName] = player
    playerById[_id] = player
    return player
  }

  function action (runAction) {
    let result
    return {
      run () {
        return runAction()
        .then(
          (value) => { result = { value } },
          (error) => { result = { error } }
        )
      },
      result: {
        get value () {
          if (!result) throw new Error('Not run!')
          if (result.error) throw result.error
          return result.value
        },
        get error () {
          if (!result) throw new Error('Not run!')
          if (!result.error) throw new Error('Did not error!')
          return result.error
        }
      }
    }
  }

  function doSignUp (username, email, password) {
    return Promise.coroutine(authenticationFlow.signUp)(
      username,
      email,
      password,
      {
        log: () => { },
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
  }

  function doLoginByUsernamePassword (username, password) {
    return Promise.coroutine(authenticationFlow.loginByUsernamePassword)(
      username,
      password,
      {
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
    playerWithName (playerName) {
      return {
        shouldBeLinkedTo (email) {
          queue(() => {
            const player = playerByPlayerName[playerName]
            const target = externalProvider.getUserByEmail(email)
            expect(player.linkedTo).toBe(target._id)
          })
        }
      }
    },
    externalSignUp (username, email, password) {
      const externalSignUpAction = action(() =>
        externalProvider.signUp(username, email, password)
      )
      queue(externalSignUpAction.run)
      return {
        mustFail () {
          queue(() => expect(externalSignUpAction.result.error).toBeTruthy())
        }
      }
    },
    signUp (username, email, password) {
      const signUpAction = action(() =>
        doSignUp(username, email, password)
      )
      queue(signUpAction.run)
      return {
        mustSucceed () {
          queue(() => expect(signUpAction.result.value.idToken).toBeTruthy())
        },
        mustFail () {
          queue(() => expect(signUpAction.result.error).toBeTruthy())
        }
      }
    },
    loginByUsernamePassword (username, password) {
      const loginAction = action(() =>
        doLoginByUsernamePassword(username, password)
      )
      queue(loginAction.run)
      return {
        mustSucceed () {
          queue(() => expect(loginAction.result.value.idToken).toBeTruthy())
        },
        mustFail () {
          queue(() => expect(loginAction.result.error).toBeTruthy())
        }
      }
    }
  }
}

function createExternalAuthProvider ({
  databaseLogIn,
  databaseGetUser,
  rule
}) {
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
            const newUser = { username: result.username, email: result.email, password }
            register(newUser)
            return newUser
          }
        })()
        if (!user) return { noUser: true }
        if (user.password !== password) return { wrongPassword: true }
        rule(user)
        const idToken = generateToken(user)
        return { idToken }
      })())
    },
    signUp (username, email, password) {
      return Promise.resolve((() => {
        const reject = (message) => Promise.reject(new Error(message))
        if (userByUsername[username]) return reject('username duplicate')
        if (userByEmail[username]) return reject('email duplicate')
        if (databaseGetUser(email)) return reject('database user conflict email')
        if (databaseGetUser(username)) return reject('database user conflict name')
        const user = { username, email, password }
        register(user)
        rule(user)
        const idToken = generateToken(user)
        return { userId: user._id, idToken }
      })())
    },
    getUserByEmail (email) {
      return userByEmail[email]
    }
  }

  function register (user) {
    user._id = 'u' + (nextUserId++)
    userByUsername[user.username] = user
    userByEmail[user.email] = user
  }

  function generateToken (user) {
    return { validToken: true, userId: user._id, email: user.email }
  }
}
