var should = require('should')
var Path = require('path')
var component = require('..')

function fixture(path) {
  return Path.join(__dirname, 'fixtures', path)
}

describe('Component loader', function() {
  describe('component(name, [setup])', function() {
    it('Should be able to require component installed by component(1)', function() {
      component(fixture('component-self-contained'))
        .should.equal('self contained foo')
    })

    it('Should be able to require component installed by npm(1)', function() {
      component(fixture('npm-self-contained'))
        .should.equal('self contained foo')
    })

    it('Should allow local components', function() {
      component(fixture('with-local-dep'))
        .should.equal('with local baz')
    })

    it('Should allow relative requires', function() {
      component(fixture('with-relative-requires'))
        .should.equal('foo bar baz')
    })

    it('Should allow to nested components to require dependencies installed on upper levels', function() {
      component(fixture('with-nested-components'))
        .should.equal('l0 l1 l2 foo bar')
    })

    it('Should allow to add lookup paths', function() {
      component(fixture('foo-bar-dependent'), function(loader) {
        loader.addLookup(fixture('.'))
      })
      .should.equal('depends on foo-bar')
    })

    it('Should allow to require development dependencies in dev mode', function() {
      component(fixture('with-dev-dep'), function(loader) {
        loader.development()
        loader.addLookup(fixture('.'))
      })
      .should.equal('I just required my dev dependency: foo-bar')
    })

    it('Should not allow to require development dependencies otherwise', function() {
      ;(function() {
        component(fixture('with-dev-dep'), function(loader) {
          loader.addLookup(fixture('.'))
        })
      }).should.throwError(/not specified as a dependency/)
    })
  })

  describe('.createRequire(setup)', function() {
    it('Should create require() function for requiring components from node', function() {
      var req = component.createRequire(function(loader) {
        loader.addLookup(fixture('.'))
      })
      req('component-self-contained').should.equal('self contained foo')
      req('foo-bar-dependent').should.equal('depends on foo-bar')
    })
  })
})
