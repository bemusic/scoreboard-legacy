const jwt = require('jsonwebtoken')

module.exports = function createTokenValidator ({ certificate }) {
  if (!certificate) throw new Error('No certificate')
  return {
    validateToken (token) {
      return new Promise((resolve, reject) => {
        const options = { algorithms: [ 'RS256' ] }
        jwt.verify(token, certificate, options, (err, payload) => {
          if (err) return reject(err)
          const result = {
            userId: payload.sub,
            playerId: payload.nickname
          }
          if (!result.playerId) return reject(new Error('JWT token does not contain player id'))
          if (!result.userId) return reject(new Error('JWT token does not contain user id'))
          resolve(result)
        })
      })
    }
  }
}
