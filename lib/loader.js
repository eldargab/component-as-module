var fs = require('fs')
var Path = require('path')
var vm = require('vm')
var Lookup = require('./lookup')

module.exports = Loader

/**
 * Create a new loader for `dir` component
 *
 * @param {String} dir
 * @param {Loader} parent
 * @api private
 */

function Loader(dir, parent) {
  this.dir = Path.resolve(dir)
  this.parent = parent
  this._lookup = new Lookup
  this.modules = {}
  this.components = {}
}

/**
 * Enable development dependencies
 *
 * @return {Loader} for chaining
 * @api public
 */

Loader.prototype.development = function() {
  this.dev = true
  return this
}

/**
 * Resolve path relative to component's dir
 *
 * @param {String} path
 * @return {String} absolute path
 * @api public
 */

Loader.prototype.path = function(p) {
  return Path.join(this.dir, p)
}

/**
 * Register known component `name`.
 * This has higher priority than lookup procedure.
 *
 * Examples:
 *
 *    loader.register('node-buffer', function() {
 *      return Buffer
 *    })
 *
 *    loader.register('foo', function(file) {
 *      // delegate to node require
 *      return require(file ? 'foo/' + file : 'foo')
 *    })
 *
 * @param {String} full component name with `/` replaced with `-`
 * @param {Function} "require" function
 * @return {Loader} for chaining
 * @api public
 */

Loader.prototype.register = function(name, fn) {
  this.components[name] = {
    load: function(file) {
      return fn(file)
    }
  }
  return this
}

/**
 * Add global lookup path.
 *
 * Given path will be resolved relative to current working dir.
 *
 * @param {String} path
 * @return {Loader} for chaining
 * @api public
 */

Loader.prototype.addLookup = function(path) {
  path = Path.resolve(path)
  this._lookup.add(path)
  return this
}

Loader.prototype.addRelativeLookup = function(p) {
  this._lookup.add(this.path(p))
  return this
}

Loader.prototype.config = function() {
  if (this._conf) return this._conf
  var path = this.path('component.json')
  var json = fs.readFileSync(path, 'utf8')
  try {
    return this._conf = JSON.parse(json)
  } catch(e) {
    throw new Error('Failed to parse ' + path + '\n' + e.message)
  }
}

Loader.prototype.load = function(file) {
  file = file || this.config().main || 'index.js'
  var script = this.resolve(file)
  if (!script) throw new Error('Failed to require  ' + file + ' of '+ this.dir + ' component.')
  return this.loadScript(script)
}

Loader.prototype.loadScript = function(script) {
  if (this.modules[script]) return this.modules[script].exports

  var path = this.path(script)
  var js = fs.readFileSync(path, 'utf8')

  if (Path.extname(script) == '.json') {
    var json = JSON.parse(js)
    this.modules[script] = {exports: json}
    return json
  }

  var require = this.getRequireFor(script)
  var module = {exports: {}}

  var sandbox = {}

  for (var key in global) {
    if (~locals.indexOf(key)) continue
    sandbox[key] = global[key]
  }

  sandbox.require = require
  sandbox.module = module
  sandbox.exports = module.exports
  sandbox.__filename = path
  sandbox.__dirname = Path.dirname(path)
  sandbox.global = sandbox

  vm.runInNewContext(js, sandbox, path)

  this.modules[script] = module

  return module.exports
}

var locals = [
  '__filename',
  '__dirname',
  'require',
  'global',
  'exports',
  'module',
  'root'
]

Loader.prototype.getRequireFor = function(file) {
  var self = this

  return function require(p) {
    if (p[0] == '.') {
      var dir = Path.dirname(file)
      return self.load(Path.join(dir, p))
    }

    p = p.split('/')
    var name = p[0]
    var f = p.slice(1).join('/')
    var dep = self.loadDependency(name)
    return dep.load(f)
  }
}

Loader.prototype.resolve = function(file) {
  var scripts = this.scripts()

  var paths = [
    file,
    file + '.js',
    file + '.json',
    Path.join(file, 'index.js'),
    Path.join(file, 'index.json')
  ]

  for (var i = 0; i < paths.length; i++) {
    if (scripts[paths[i]]) return paths[i]
  }
}

Loader.prototype.scripts = function() {
  if (this._scripts) return this._scripts
  var scripts = this.config().scripts || []
  return this._scripts = scripts.reduce(function(hash, script) {
    var path = Path.normalize(script)
    hash[path] = path
    return hash
  }, {})
}

Loader.prototype.loadDependency = function(name) {
  var fullname = this.deps()[name]
  if (!fullname)
    throw new Error('Component "' + name + '" is not specified as a dependency for ' + this.dir)
  return this.loadComponent(fullname)
}

Loader.prototype.deps = function() {
  if (this._deps) return this._deps
  this._deps = {}

  var config = this.config()

  var deps = mix({}, config.dependencies, this.dev && config.development)
  for (var key in deps) {
    key = key.split('/')
    var repo = key[0]
    var name = key[1]
    this._deps[name] = repo + '-' + name
  }

  var locals = config.local || []
  locals.forEach(function(name) {
    this._deps[name] = name
  }, this)

  return this._deps
}

Loader.prototype.loadComponent = function(name) {
  if (this.components[name]) return this.components[name]

  var path = this._lookup.find(name)

  var comp = path
    ? new Loader(path, this).addRelativeLookup('components')
    : this.parent && this.parent.loadComponent(name)

  if (!comp) throw new Error('Failed to lookup component ' + name)

  return this.components[name] = comp
}

function mix(t) {
  var sources = [].slice.call(arguments, 1)
  sources.forEach(function(src) {
    for (var key in src) {
      t[key] = src[key]
    }
  })
  return t
}
