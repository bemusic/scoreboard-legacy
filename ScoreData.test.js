/* eslint-env jest */
const ScoreData = require('./ScoreData')

describe('ScoreData', () => {
  describe('updating', () => {
    it('records score', () => {
      const result = ScoreData.update(null, {
        score: 505050,
        combo: 91,
        count: 93,
        log: 'A1B2'
      })
      expect(result.recordedAt).toBeInstanceOf(Date)
      delete result.recordedAt
      expect(result).toEqual({
        playCount: 1,
        playNumber: 1,
        combo: 91,
        count: 93,
        log: 'A1B2',
        score: 505050
      })
    })
    it('only changes the playCount if not beaten', () => {
      const oldData = {
        playCount: 1,
        playNumber: 1,
        combo: 91,
        count: 93,
        log: 'A1B2',
        score: 505050,
        recordedAt: new Date()
      }
      const result = ScoreData.update(oldData, {
        score: 505049,
        combo: 90,
        count: 93,
        log: 'A0B3'
      })
      expect(result).toEqual({
        playCount: 2,
        playNumber: 1,
        combo: 91,
        count: 93,
        log: 'A1B2',
        score: 505050,
        recordedAt: oldData.recordedAt
      })
    })
    it('records new data if beaten', () => {
      const oldData = {
        playCount: 2,
        playNumber: 1,
        combo: 91,
        count: 93,
        log: 'A1B2',
        score: 505050,
        recordedAt: new Date(0)
      }
      const result = ScoreData.update(oldData, {
        score: 535251,
        combo: 92,
        count: 93,
        log: 'A2B1'
      })
      expect(+result.recordedAt).toBeGreaterThan(+oldData.recordedAt)
      delete result.recordedAt
      expect(result).toEqual({
        playCount: 3,
        playNumber: 3,
        combo: 92,
        count: 93,
        log: 'A2B1',
        score: 535251
      })
    })
  })
})
