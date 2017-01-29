const { buildSchema } = require('graphql')

const schema = buildSchema(`
  schema {
    query: Query
    mutation: Mutation
  }

  # Query stuff from Bemuse internet ranking system here!
  type Query {
    # Query a chart by its MD5.
    chart(md5: String!): Chart

    # The current player.
    me: Self

    # Queries a player by name
    player(name: String!): PublicPlayerData
  }

  # Do stuff
  type Mutation {
    # Register a player (or return an existing one)
    registerPlayer(name: String!): PublicPlayerData
  }

  # The current player.
  type Self {
    # Queries my own record of charts.
    records(ids: [String]): [RankingEntry]
  }

  # A publicly-accessible player data
  type PublicPlayerData {
    # The player’s name
    name: String!

    # Is the player name linked to an auth account
    linked: Boolean!

    # The player’s ID
    id: String!
  }

  # A notechart (.bms, .bmson) file, identified by its file hash (MD5).
  # In Bemuse, different play mode is a different Level and thus has a
  # different scoreboard.
  type Chart {
    # Query a level by play mode (KB or BM).
    level(playMode: String!): Level
  }

  # A Level is identified by a chart’s hash and its play mode.
  # Each Level has its own scoreboard.
  type Level {
    # A leaderboard associated with this level.
    leaderboard(max: Int): [LeaderboardRow]
  }

  # A leaderboard row
  type LeaderboardRow {
    # The ranking.
    rank: Int!

    # The ranking entry.
    entry: RankingEntry!
  }

  # A ranked entry in the leaderboard.
  type RankingEntry {
    # An internal ID used by the internet ranking system.
    id: String!

    # The chart’s MD5 hash.
    md5: String!

    # The play mode.
    playMode: String!

    # The score (ranges from 0–555555).
    score: Int!

    # Total number of notes (long note head and tail counted as separate note).
    total: Int!

    # The maximum combo attained.
    combo: Int!

    # An array of [Meticulous, Precise, Good, Offbeat, Missed] count.
    count: [Int]

    # A string representing the replay.
    log: String

    # Total number of plays for this level.
    playCount: Int!

    # The play number (out of playCount) for this particular score.
    playNumber: Int!

    # The name of the player.
    playerName: String!
  }
`)

module.exports = schema
