function yock (services, {
  log = (text) => console.log('[yock]', text)
} = { }) {
  const cache = { }

  const registry = {
    get (serviceName) {
      return cache[serviceName] || (cache[serviceName] = instantiate(serviceName))
    }
  }

  function instantiate (serviceName) {
    return new Promise(resolve => {
      const definition = services[serviceName]
      if (!definition) throw new Error(`yock: Service "${serviceName}" not found.`)
      if (!definition.create) throw new Error(`yock: Service "${serviceName}" not created.`)
      const dependencies = { }
      const resolutions = Object.keys(definition.dependencies || { }).map(dependencyName => {
        const promise = registry.get(definition.dependencies[dependencyName])
        return Promise.resolve(promise).then(dependencyService => {
          dependencies[dependencyName] = dependencyService
        })
      })
      resolve(Promise.all(resolutions).then(() => {
        log('Instantiating ' + serviceName + '...')
        return definition.create(dependencies)
      }))
    })
  }

  return registry
}

module.exports = yock
