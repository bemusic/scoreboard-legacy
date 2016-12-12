
exports.loginByUsernamePassword =
function * loginByUsernamePassword (username, password, {
  usernamePasswordLogin,
  resolvePlayerId,
  log = (message) => console.log('[loginByUsernamePassword]', message)
}) {
  {
    const { idToken, error: authError } = yield * obtainIdToken()
    if (authError) {
      return { error: authError }
    }
    return { idToken }
  }

  function * obtainIdToken () {
    let triedEmail = false
    if (/@/.test(username)) {
      log('Authenticating using email...')
      const email = username
      const result = yield usernamePasswordLogin(email, password)
      if (result.idToken) {
        log('Authenticated using email.')
        return { idToken: result.idToken }
      }
      triedEmail = true
    }

    log('Resolving player...')
    const resolveResult = yield resolvePlayerId(username)
    if (!resolveResult.playerId) {
      return { error: triedEmail ? 'Invalid email or password' : 'Player not registered' }
    }
    const playerId = resolveResult.playerId

    log('Authenticating player...')
    const result = yield usernamePasswordLogin(playerId, password)
    if (!result.idToken) {
      return { error: 'Invalid password' }
    }
    return { idToken: result.idToken }
  }
}
