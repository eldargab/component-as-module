# component-as-module

It allows you to require [components](http://github.com/component/component) from node programs.

Lookup algorithm is slightly different
from [component/builder.js](https://github.com/component/builder.js)
in that it does not respect `.paths` field from `component.json`.
On the other hand each component implicitly tries to find its dependency in a `./components` dir at first.
If that fails, child delegates lookup to its parent. So we have a behaviour somewhat similar
to what node does with `node_modules`.

## Examples

Require stand-alone component (with all dependencies in a components dir):

```javascript
var component = require('component-as-module')
var min = component('component-min')
```

Add additional lookup paths or enable dev dependencies:

```javascript
var boot = component('boot', function(loader) {
  loader.addLookup('node_modules')
  loader.development()
})
```

Alternative way is to create a special require function:

```javascript
var req = component.createRequire(function (loader) {
  loader.addLookup('components')
})

var min = req('component-min')
```

This differs from the above examples in that all loaded components are preserved
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
