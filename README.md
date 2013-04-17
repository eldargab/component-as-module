# component-as-module

It allows to require [components](http://github.com/component/component) from node programs.

Another way to consume components from node is to use
[component-npm-post-install](http://github.com/eldargab/component-npm-post-install) script.

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

Alternative way to require components is to create a special require function:

```javascript
var req = component.createRequire(function (loader) {
  loader.addLookup('components')
})

var min = req('component-min')
```

This differs from the above examples in that all loaded components are preserved
between calls, so, for example, requiring `component-min` second time is fast and
you get the same instance.

## Why

I believe there should be only one package convention for the web. No matter what side it is.
Component is a good one. This project should help to use it for both node and browser.

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

## License

MIT
