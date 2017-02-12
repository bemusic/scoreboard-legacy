/* eslint-env jest */

const { graphql } = require('graphql')
const schema = require('./schema')
const createRoot = require('./createRoot')

describe('GraphQL endpoint', () => {
  describe('leaderboard', () => {
    it('should be able to fetch records', () => {
      const query = `{
        chart(md5: "song") {
          level(playMode: "BM") {
            leaderboard(max: 20) {
              entry { player { name }, score }
              rank
            }
          }
        }
      }`
      const rankingEntryRepository = {
        fetchLeaderboardEntries ({ md5, playMode, max }) {
          return Promise.resolve([
            { playerId: 'A', data: { score: 555555, combo: 4000, recordedAt: new Date() } },
            { playerId: 'B', data: { score: 400000, combo: 400, recordedAt: new Date() } },
            { playerId: 'C', data: { score: 200000, combo: 40, recordedAt: new Date() } }
          ])
        }
      }
      const playerRepository = {
        findById (playerId) {
          return Promise.resolve({ _id: playerId, playerName: playerId })
        }
      }
      const root = createRoot({
        rankingEntryRepository,
        playerRepository
      })
      return graphql(schema, query, root).then((result) => {
        expect(result).toEqual({
          data: {
            chart: {
              level: {
                leaderboard: [
                  { rank: 1, entry: { player: { name: 'A' }, score: 555555 } },
                  { rank: 2, entry: { player: { name: 'B' }, score: 400000 } },
                  { rank: 3, entry: { player: { name: 'C' }, score: 200000 } }
                ]
              }
            }
          }
        })
      })
    })
  })
})
