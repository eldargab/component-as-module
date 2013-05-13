# component-as-module

It allows you to require [components](http://github.com/component/component) from node programs.

Lookup algorithm is slightly different
from [component/builder.js](https://github.com/component/builder.js)
in that it does not respect `.paths` field from `component.json`.
It also executes every file in a new vm context so globals are not shared.

## Examples

Require stand-alone component (with all dependencies in a `./components` dir):

```javascript
var component = require('component-as-module')
var min = component('/path-to/component-min')
```

Setup loader:

```javascript
var boot = component('boot', function(loader) {
  // add lookup paths
  loader.addLookup('./components')

  // enable dev dependencies
  loader.development()

  // register node module as a component
  loader.register('foo', require)
})
```

Alternative way to require components is to create a special "require" function:

```javascript
var req = component.createRequire(function(loader) {
  loader.addLookup('components')
})

var min = req('component-min')
```

This differs in that all loaded components are preserved
between calls, so, for example, requiring `component-min` the second time is fast and
you get the same instance.

## Installation

with npm

```
npm install component-as-module
```

To run tests

```
npm install -d
npm test
```

## Related

There is also
[component-npm-post-install](http://github.com/eldargab/component-npm-post-install) script
which can be used to make component package compatible with npm.

## License

MIT
