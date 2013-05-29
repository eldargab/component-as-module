var fs = require('fs')
var Path = require('path')
var vm = require('vm')
var Lookup = require('./lookup')

module.exports = Loader

/**
 * Create a new loader for `dir` component
 *
 * @param {String} dir
 * @param {Loader} root
 * @api private
 */

function Loader(dir, root) {
  this.dir = Path.resolve(dir)
  this.root = root
  this._lookup = new Lookup
  this._hooks = root && root._hooks || {}
  this._files = {}
  this.modules = {}
  this.components = {}
}

/**
 * Apply the given setup function.
 *
 * @param {Function} setup
 * @return {Loader}
 * @api public
 */

Loader.prototype.use = function(setup) {
  var fn = setup
  arguments[0] = this
  fn.apply(this, arguments)
  return this
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
 * Define hook `name` with callback `fn()`.
 *
 * @param {String} name
 * @param {String} fn
 * @api public
 */

Loader.prototype.hook = function(name, fn) {
  this._hooks[name] = this._hooks[name] || []
  this._hooks[name].push(fn)
  return this
}

/**
 * Add file `type` `filename` contents of `val`.
 *
 * @param {String} type
 * @param {String} filename
 * @param {String} val
 * @api public
 */

Loader.prototype.addFile = function(type, filename, val){
  var files = this.config[type] || (this.config[type] = [])
  files.push(filename)
  this._files[filename] = val
}

/**
 * Remove file `type` `filename`
 *
 * @param {String} type
 * @param {String} filename
 * @param {String} val
 * @api public
 */

Loader.prototype.removeFile = function(type, filename){
  var files = this.config[type] || (this.config[type] = [])
  var i = files.indexOf(filename)
  if (~i) files.splice(i, 1)
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
 *    // delegate to node require
 *    loader.register('foo', require)
 *
 * @param {String} full component name with `/` replaced with `-`
 * @param {Function} "require" function
 * @return {Loader} for chaining
 * @api public
 */

Loader.prototype.register = function(name, fn) {
  this.components[name] = {
    load: function(file) {
      return fn(file ? name + '/' + file : name)
    }
  }
  return this
}

/**
 * Add global lookup path.
 *
 * Given path will be resolved relative to the current working dir.
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

Loader.prototype.json = function() {
  if (this.config) return this.config
  var path = this.path('component.json')
  var json = fs.readFileSync(path, 'utf8')
  try {
    return this.config = JSON.parse(json)
  } catch(e) {
    throw new Error('Failed to parse ' + path + '\n' + e.message)
  }
}

Loader.prototype.load = function(file) {
  file = file || this.json().main || 'index.js'
  var script = this.resolve(file)
  if (!script) throw new Error('Failed to require  ' + file + ' of '+ this.dir + ' component.')
  return this.loadScript(script)
}

Loader.prototype.loadScript = function(script) {
  if (this.modules[script]) return this.modules[script].exports

  var path = this.path(script)
  var js = this._files[script] || fs.readFileSync(path, 'utf8')

  if (Path.extname(script) == '.json') {
    var json = JSON.parse(js)
    this.modules[script] = {exports: json}
    return json
  }

  var closure = '(function() { return function(module, exports, require, __dirname, __filename) { '
    + js + '\n}})()'

  var fn = vm.runInThisContext(closure, path)

  var require = this.getRequireFor(script)
  var module = {exports: {}}
  var dir = Path.dirname(path)

  this.modules[script] = module

  fn.call(module.exports, module, module.exports, require, dir, path)

  return module.exports
}

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
  var config = this.json()
  this.performHook('before scripts')
  var scripts = config.scripts || []
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

  var config = this.json()

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
    ? new Loader(path, this.root || this)
    : this.root && this.root.loadComponent(name)

  if (!comp) throw new Error('Failed to lookup component ' + name)

  return this.components[name] = comp
}

Loader.prototype.performHook = function(name) {
  var hooks = this._hooks[name]
  if (!hooks) return
  for (var i = 0; i < hooks.length; i++) {
    hooks[i](this)
  }
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
