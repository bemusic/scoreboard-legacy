const { buildSchema } = require('graphql')
const { readFileSync } = require('fs')

const content = readFileSync('./schema.graphql', 'utf8')
const schema = buildSchema(content)

module.exports = schema
