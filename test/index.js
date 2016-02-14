'use strict'
const expect = require('chai').expect
const express = require('express')
const hexi = require('hexi')
const hexiCache = require('..')

describe('cache()', function() {
  let server

  beforeEach(function() {
    server = hexi(express())
    return server.register([
      hexiCache,
    ])
  })

  it('provisions a server cache', function(done) {
    const cache = server.cache({ segment: 'test', expiresIn: 1000 })

    cache.set('a', 'going in', 0, err => {
      expect(err).to.not.exist
      cache.get('a', (err, value, cached, report) => {
        expect(err).to.not.exist
        expect(value).to.equal('going in')
        done()
      })
    })
  })

  it.skip('throws when missing segment', function() {
    expect(() => server.cache({ expiresIn: 1000 }))
      .to.throw('Missing cache segment name')
  })

  it.skip('provisions a server cache with custom partition', function(done) {
    const server = new hexi.Server({ cache: { engine: CatboxMemory, partition: 'hexi-test-other' } })
    server.connection()
    const cache = server.cache({ segment: 'test', expiresIn: 1000 })
    server.initialize(err => {
      expect(err).to.not.exist()

      cache.set('a', 'going in', 0, err => {

        expect(err).to.not.exist()
        cache.get('a', (err, value, cached, report) => {

          expect(err).to.not.exist()
          expect(value).to.equal('going in')
          expect(cache._cache.connection.settings.partition).to.equal('hexi-test-other')
          done()
        })
      })
    })
  })

  it('throws when allocating an invalid cache segment', function() {
    expect(() => {
      server.cache({ segment: 'a', expiresAt: '12:00', expiresIn: 1000 })
    }).throws()
  })

  it('allows allocating a cache segment with empty options', function() {
    expect(() => server.cache({ segment: 'a' })).to.not.throw()
  })

  it.skip('allows reusing the same cache segment (server)', function(done) {
    const server = new hexi.Server({ cache: { engine: CatboxMemory, shared: true } })
    server.connection()
    expect(() => {
      server.cache({ segment: 'a', expiresIn: 1000 })
      server.cache({ segment: 'a', expiresIn: 1000 })
    }).to.not.throw()
    done()
  })

  it('allows reusing the same cache segment (cache)', function() {
    expect(() => {
      server.cache({ segment: 'a', expiresIn: 1000 })
      server.cache({ segment: 'a', expiresIn: 1000, shared: true })
    }).to.not.throw()
  })

  it.skip('uses plugin cache interface', function(done) {
    function test(srv, options, next) {
      const cache = srv.cache({ expiresIn: 10 })
      srv.expose({
        get: function(key, callback) {
          cache.get(key, (err, value, cached, report) => {
            callback(err, value);
          })
        },
        set: function(key, value, callback) {
          cache.set(key, value, 0, callback);
        },
      })

      return next()
    }

    test.attributes = {
      name: 'test',
    }

    const server = new hexi.Server()
    server.connection()
    server.register(test, err => {
      expect(err).to.not.exist()
      server.initialize(err => {
        expect(err).to.not.exist()

        server.plugins.test.set('a', '1', err => {
          expect(err).to.not.exist()
          server.plugins.test.get('a', (err, value1) => {

            expect(err).to.not.exist()
            expect(value1).to.equal('1')
            setTimeout(() => {
              server.plugins.test.get('a', (err, value2) => {
                expect(err).to.not.exist()
                expect(value2).to.equal(null)
                done()
              })
            }, 11)
          })
        })
      })
    })
  })
})
