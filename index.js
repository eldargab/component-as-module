var Loader = require('./lib/loader')

/**
 * Require component `dir`
 *
 * Examples:
 *
 *    var component = require('component-as-module')
 *    var min = component('component-min')
 *
 *  You can also pass optional `setup` function to add lookup paths, etc
 *
 *    var min = component('component-min', function(loader) {
 *      loader.addLookup('fixtures')
 *      loader.development()
 *    })
 *
 * @param {String} dir
 * @param {Function} setup (optional)
 * @return {Mixed} module.exports
 * @api public
 */

exports = module.exports = function requireComponent(dir, setup) {
  var loader = new Loader(dir)
  loader.addRelativeLookup('components')
  setup && setup(loader)
  return loader.load()
}

/**
 * Create require function for components.
 *
 * This differs from requiring with `component()` in that
 * all loaded modules are cached and available for next requires.
 *
 * Examples:
 *
 *    var component = require('component-as-module')
 *    var req = component.createRequire(function(loader) {
 *      loader.addLookup('components')
 *    })
 *
 *    var min = req('component-min')
 *
 * @param {Function} setup (required)
 * @return {Function} require function
 * @api public
 */

exports.createRequire = function(setup) {
  if (typeof setup != 'function')
    throw new TypeError('You must provide setup function to setup loader.')

  var loader = new Loader('.')

  setup(loader)

  return function(component) {
    var p = component.split('/')
    var name = p[0]
    var file = p.slice(1).join('/')
    return loader.loadComponent(name).load(file)
  }
}
