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
  return this.eachPath(function(path, items) {
    if (!~items.indexOf(item)) return
    return join(path, item)
  })
}

Lookup.prototype.eachPath = function(cb) {
  for (var i = 0; i < this.paths.length; i++) {
    var path = this.paths[i]
    var items = this.cache[path] || (this.cache[path] = readdir(path))
    var result = cb(path, items)
    if (result) return result
  }
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
