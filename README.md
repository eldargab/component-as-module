# component-as-module

It allows to require [components](http://github.com/component/component) from node modules
as well as share them with npm community.

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
you recieve the same instance.

## Sharing components with npm

To make a component consumable with npm:

1) Create a package.json file

2) Set the `name` field to either full or partial component name,
i.e. to `username-foo` or to `foo`.

3) List dependencies. Because npm understands github urls you
can safely specify them in a component style:

```json
{
  "name": "foo",
  "dependencies": {
    "bar": "org/bar",
    "baz": "org/baz",
    "qux": "*" // dependency from npm (assuming it is a component) is also ok.
  }
}
```

4) Create a node specific main file:

node-main.js

```javascript
module.exports = require('component-as-module')(__dirname)
```

package.json

```json
{
  "name": "foo",
  "dependencies": {
    "bar": "org/bar",
    "baz": "org/baz",
    "qux": "*", // dependency from npm (assuming it is a component) is also ok.
    "component-as-module": "*" // add additional component-as-module dependency
  },
  "main": "node-main"
}
```

After that you can safely publish it to npm. It will work like any other npm module. (Just don't forget to include
`component.json` to package.)

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
