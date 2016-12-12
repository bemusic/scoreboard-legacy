
exports.loginByUsernamePassword =
function * loginByUsernamePassword (username, password, {
  // (usernameOrEmail, password) => Promise
  // - If result contain `idToken` property => OK.
  // - Otherwise, invalid username or password.
  usernamePasswordLogin,

  // (username) => Promise
  // - If result contain `playerId` property => OK.
  // - Otherwise, player not found.
  resolvePlayerId,

  log = (message) => console.log('[loginByUsernamePassword]', message)
}) {
  {
    const { idToken } = yield * obtainIdToken()
    return { idToken }
  }

  function * obtainIdToken () {
    let triedEmail = false
    if (/@/.test(username)) {
      log('Authenticating using email...')
      const email = username
      const { idToken } = yield usernamePasswordLogin(email, password)
      if (idToken) {
        log('Authenticated using email.')
        return { idToken: idToken }
      }
    }

    log('Resolving player...')
    const { playerId } = yield resolvePlayerId(username)
    if (!playerId) {
      throw new Error(triedEmail
        ? 'Invalid email or password'
        : 'Player not registered'
      )
    }

    log('Authenticating player...')
    const { idToken } = yield usernamePasswordLogin(playerId, password)
    if (!idToken) {
      throw new Error('Invalid password')
    }
    return { idToken }
  }
}

exports.signUp =
function * signUp (username, email, password, {
  log = (message) => console.log('[loginByUsernamePassword]', message),

  // (username, email, password) => Promise
  // - Result should always contain `idToken` property.
  // - Otherwise, it should reject (throw).
  userSignUp,

  // (playerId) => Promise
  // - Result should be a string.
  reservePlayerId,

  // (playerId) => Promise
  // - Result is a boolean.
  checkPlayerNameAvailability
}) {
  log('Checking player name availability...')
  const available = yield checkPlayerNameAvailability(username)

  if (!available) {
    throw new Error('Player name already taken')
  }

  log('Registering player name...')
  const playerId = yield reservePlayerId(username)

  log('Creating account...')
  const { idToken } = yield userSignUp(playerId, email, password)
  if (!idToken) {
    throw new Error('Cannot sign up (unknown error)')
  }
  return { idToken }
}
