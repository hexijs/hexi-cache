'use strict'
const catbox = require('catbox')
const hoek = require('hoek')
const catboxMemory = require('catbox-memory')

module.exports = (server, opts, next) => {
  const caches = {}

  server.decorate('server', 'cacheClient', (cacheName, adapter, cb) => {
    if (caches[cacheName])
      throw new Error(cacheName + ' cache client already registered')

    let client = new catbox.Client(adapter)
    caches[cacheName] = {
      client,
      segments: {},
    }
    client.start(cb)
  })

  server.decorate('server', 'cache', (options, _segment) => {
    const segment = options.segment || _segment ||
      (server.realm.plugin ? '!' + server.realm.plugin : '')

    hoek.assert(segment, 'Missing cache segment name')
    const cacheName = options.cache || '_default'
    const cache = caches[cacheName]
    hoek.assert(cache, 'Unknown cache', cacheName)
    hoek.assert(!cache.segments[segment] || cache.shared || options.shared,
      'Cannot provision the same cache segment more than once')
    cache.segments[segment] = true

    return new catbox.Policy(options, cache.client, segment)
  })

  server.cacheClient('_default', catboxMemory, next)
}

module.exports.attributes = {
  pkg: require('./package.json'),
}
