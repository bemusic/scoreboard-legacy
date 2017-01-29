const log4js = require('log4js')
const Promise = require('bluebird')
const configuration = require('./configuration')
const yock = require('./yock')

function main () {
  return Promise.coroutine(function * () {
    const services = Object.assign({ }, ...[
      configuration.logger,
      configuration.config,
      configuration.authentication,
      configuration.database,
      configuration.repository,
      configuration.api
    ])
    const container = yock(services)
    const port = +process.env.PORT || 8008
    const app = yield container.get('api:app')
    runApiServer(app, port)
  })()
}

main().catch((e) => setTimeout(() => { throw e }))

function runApiServer (app, port) {
  app.listen(port, function (err) {
    if (err) throw err
    const address = this.address()
    log4js.getLogger('HTTP').info('Listening on port ' + address.port)
  })
}
