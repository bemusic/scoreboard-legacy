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
              entry { playerName, score }
              rank
            }
          }
        }
      }`
      const rankingEntryRepository = {
        fetchLeaderboardEntries ({ md5, playMode, max }) {
          return Promise.resolve([
            { playerName: 'A', score: 555555, combo: 4000 },
            { playerName: 'B', score: 400000, combo: 400 },
            { playerName: 'C', score: 200000, combo: 40 }
          ])
        }
      }
      const root = createRoot({ rankingEntryRepository })
      return graphql(schema, query, root).then((result) => {
        expect(result).toEqual({
          data: {
            chart: {
              level: {
                leaderboard: [
                  { rank: 1, entry: { playerName: 'A', score: 555555 } },
                  { rank: 2, entry: { playerName: 'B', score: 400000 } },
                  { rank: 3, entry: { playerName: 'C', score: 200000 } }
                ]
              }
            }
          }
        })
      })
    })
  })
})
