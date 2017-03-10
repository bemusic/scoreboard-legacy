/* eslint-env jest */

const createPlayerTokenService = require('./createPlayerTokenService')

describe('player token', () => {
  it('can be generated from player id', () => {
    const playerTokenService = createPlayerTokenService({ secret: 'meow' })
    return playerTokenService
      .generatePlayerToken('aaa')
      .then(token => {
        return playerTokenService
          .validatePlayerToken(token)
          .then(result => {
            expect(result.playerId).toEqual('aaa')
          })
      })
  })
  it('does not allow badly signed tokens', () => {
    const playerTokenService = createPlayerTokenService({ secret: 'meow' })
    const badPlayerTokenService = createPlayerTokenService({ secret: 'nyan' })
    return badPlayerTokenService
      .generatePlayerToken('aaa')
      .then(token => {
        return playerTokenService
          .validatePlayerToken(token)
          .then(
            () => { throw new Error('Expected validatePlayerToken to reject but it does not') },
            () => { }
          )
      })
  })
})
