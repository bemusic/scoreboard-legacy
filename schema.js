const { buildSchema } = require('graphql')
const { readFileSync } = require('fs')

const content = readFileSync(require.resolve('./schema.graphql'), 'utf8')
const schema = buildSchema(content)

module.exports = schema
