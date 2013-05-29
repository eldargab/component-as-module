var should = require('should')
var Path = require('path')
var compile = require('string-to-js')
var fs = require('fs')
var component = require('..')

function fixture(path) {
  return Path.join(__dirname, 'fixtures', path)
}

describe('Component loader', function() {
  describe('component(dir, [setup])', function() {
    it('Should be able to require self contained components', function() {
      component(fixture('component-self-contained'))
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

    it('Should allow to add lookup paths', function() {
      component(fixture('foo-bar-dependent'), function(loader) {
        loader.addLookup(fixture('.'))
      })
      .should.equal('depends on foo-bar')
    })

    it('Child components should inherit lookup paths from the root', function() {
      component(fixture('with-dep-with-dep'))
        .should.equal('foo')
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

    it('Should allow to register known components', function() {
      component(fixture('foo-bar-dependent'), function(loader) {
        loader.register('foo-bar', function(p) {
          p.should.equal('foo-bar/index')
          return 'bar'
        })
      }).should.equal('depends on bar')
    })

    it('Known components should have precedence over lookup procedure', function() {
      component(fixture('component-self-contained'), function(loader) {
        loader.register('foo-dep', function() {
          return 'component'
        })
      }).should.equal('self contained component')
    })

    it('Should give access to globals', function() {
      var globals = component(fixture('globals'))
      Array.isArray(new globals.Array).should.be.true
      globals.__dirname.should.equal(fixture('globals'))
      globals.__filename.should.equal(fixture('globals/index.js'))
    })

    it('Should support component-builder plugins', function() {
      component(fixture('with-templates'), function(loader) {
        loader.hook('before scripts', function(pkg) {
          pkg.removeFile('scripts', 'index.js')
          var templates = pkg.config.templates || []
          templates.forEach(function(tpl) {
            var str = fs.readFileSync(pkg.path(tpl), 'utf8').trim()
            var js = compile(str)
            pkg.addFile('scripts', 'index.js', js)
          })
        })
      }).should.equal('Hello world!')
    })
  })

  describe('.createRequire(setup)', function() {
    it('Should create require() function for requiring components from node', function() {
      var req = component.createRequire(function(loader) {
        loader.addLookup(fixture('.'))
      })
      req('foo-bar').should.equal('foo-bar')
      req('foo-bar-dependent').should.equal('depends on foo-bar')
    })

    it('Second require call should give the same instance', function() {
      var req = component.createRequire(function(loader) {
        loader.addLookup(fixture('.'))
      })
      req('object-component').should.equal(req('object-component'))
    })
  })

  describe('loader.use()', function() {
    it('Should apply the given setup function', function(done) {
      component.createRequire(function(loader) {
        loader.use(function(l, a, b) {
          l.should.equal(loader)
          a.should.equal('a')
          b.should.equal('b')
          done()
        }, 'a', 'b')
      })
    })
  })
})
