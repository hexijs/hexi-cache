'use strict'
const catbox = require('catbox')
const hoek = require('hoek')
const catboxMemory = require('catbox-memory')

module.exports = function(server, opts, next) {
  server.root._caches = {}

  server.decorate('server', 'cacheClient', (cacheName, adapter, cb) => {
    if (server.root._caches[cacheName])
      throw new Error(cacheName + ' cache client already registered')

    let client = new catbox.Client(adapter)
    server.root._caches[cacheName] = {
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
    const cache = server.root._caches[cacheName]
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
