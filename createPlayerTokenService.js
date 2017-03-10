const jwt = require('jsonwebtoken')

module.exports = function createPlayerTokenService ({ secret }) {
  if (!secret) throw new Error('No secret')
  return {
    validatePlayerToken (token) {
      return new Promise((resolve, reject) => {
        const options = { algorithms: [ 'HS256' ] }
        jwt.verify(token, secret, options, (err, payload) => {
          if (err) return reject(err)
          const result = { playerId: payload.sub }
          if (!result.playerId) return reject(new Error('JWT token does not contain player id'))
          resolve(result)
        })
      })
    },
    generatePlayerToken (playerId) {
      return new Promise((resolve, reject) => {
        const options = { algorithm: 'HS256', expiresIn: 86400e3 * 14 }
        jwt.sign({ sub: playerId }, secret, options, (err, token) => {
          if (err) return reject(err)
          resolve(token)
        })
      })
    }
  }
}
