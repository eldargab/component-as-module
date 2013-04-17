var join = require('path').join
var fs = require('fs')

module.exports = Lookup

function Lookup() {
  this.paths = []
  this.cache = {}
}

Lookup.prototype.add = function(path) {
  this.paths.push(path)
  return this
}

Lookup.prototype.find = function(item) {
  for (var i = 0; i < this.paths.length; i++) {
    var path = this.findIn(this.paths[i], item)
    if (path) return path
  }
}

Lookup.prototype.findIn = function(dir, item) {
  var items = this.cache[dir] || (this.cache[dir] = readdir(dir))
  if (~items.indexOf(item)) return join(dir, item)
}

function readdir(dir) {
  try {
    return fs.readdirSync(dir)
  } catch(e) {
    if (e.code == 'ENOENT' || e.code == 'ENOTDIR')
      return []
    throw e
  }
}
