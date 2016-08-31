<p align="center"><img src="http://files.jenius.im/_/NpnfqKD.png" style="max-width: 100%" /></p>
<hr />

[![npm](https://img.shields.io/npm/v/reshape.svg?style=flat-square)](https://npmjs.com/package/reshape)
[![tests](https://img.shields.io/travis/reshape/reshape.svg?style=flat-square)](https://travis-ci.org/reshape/reshape?branch=master)
[![dependencies](https://img.shields.io/david/reshape/reshape.svg?style=flat-square)](https://david-dm.org/reshape/reshape)
[![coverage](https://img.shields.io/coveralls/reshape/reshape.svg?style=flat-square)](https://coveralls.io/r/reshape/reshape?branch=master)
[![gitter](https://img.shields.io/gitter/room/reshape/reshape.svg?style=flat-square)](https://gitter.im/reshape/reshape?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=badge")

Reshape is a tool for transforming HTML with JavaScript plugins. Reshape parses input HTML into an [abstract syntax tree](#reshape-ast) (AST). Plugins receive the AST, can transform it as they wish, and return it to be passed to the next plugin. When all plugins have finished, reshape transforms the AST into a JavaScript function which, when called, will produce a string of HTML.

## Table of Contents

- [Installation](#installation)
- [Basic Example](#usage)
- [Configuration Options](#options)
- [The Reshape AST](#reshape-ast)
- [Writing Plugins](#writing-a-plugin)
- [Plugin Directory](http://plugins.reshape.ml)
- [License, Contributing, Etc](#etc)

## Installation

Reshape can be installed through npm, and requires node v6 or higher.

```sh
npm i reshape --save
```

## Usage

Initialize `reshape` with some plugins you'd like to use and [any other options](#options), then call `process` with the HTML you'd like to process. For example:

```js
const reshape = require('reshape')
const expressions = require('reshape-expressions')
const include = require('reshape-include')

let html = `
    <section>
      <h1>Reshape is so cool!</h1>
      <p>Hello, {{ planet}}!</p>
      include(src='_partial.html')
    </section>`

reshape({ plugins: [expressions(), include()] })
    .process(html)
    .then((result) => {
        console.log(result.output({ planet: 'world' }))
        // <section>
        //  <h1>Reshape is so cool!</h1>
        //  <p>Hello, world!</p>
        //  <p>Hello from a partial!</p>
        // </section>
    })
```

Reshape generates a JavaScript template as its output, which can be called (with optional locals) to produce a string. This means that reshape can generate static HTML as well as JavaScript templates for the front-end.

### Options

None of the options are required, any of them may be skipped.

| Option | Description | Default |
| ------ | ----------- | ------- |
| **plugins** | Either a single plugin or an array of plugins to be used | `[]`
| **parser** | Override the default parser | [parser](https://github.com/reshape/parser)
| **generator** | Override the default code generator | [code-gen](https://github.com/reshape/code-gen)
| **parserOptions** | Options to be passed to the parser |
| **generatorOptions** | Options to be passed to the code generator |
| **runtime** | A place to store functions executed at runtime | `{}`
| **filename** | Name of the file being processed, for debugging. |

A quick example, using [sugarml](https://github.com/reshape/sugarml), a jade-like, whitespace-based custom parser:

```js
const reshape = require('reshape')
const sugarml = require('sugarml')

const html = `
#main
  p hello world!
`

reshape({ parser: sugarml })
  .process(html)
  .then((result) => {
    console.log(result.output())
    // <div id='main'><p>hello world!</p></div>
  })
```

Options can also be passed either to the `reshape` constructor as above, or to the `process` method. Options passed to `reshape` will persist between compiles, where options passed to `process` will only apply for that particular compile. Options passed to `process` will be deep-merged with existing options and take priority if there is a conflict. For example:

```js
const ph = reshape({ plugins: [example(), anotherExample()] })

ph.process(someHtml, { filename: 'foo.html'})
ph.process(otherHtml, { filename: 'bar.html', plugins: [alternatePlugin()] })
ph.process(evenMoreHtml, { parser: someParser })
```

Here, the default plugins applied to `ph` at the top will apply to all compiles, except for the second, in which we override them locally. All other options will be merged in and applied only to their individual compiles.

## Reshape AST

Plugins act on an [abstract syntax tree](https://www.wikiwand.com/en/Abstract_syntax_tree) which represents the HTML structure, but is easier to search and modify than plain text. It is a very simple [recursive tree structure](https://www.wikiwand.com/en/Tree_(data_structure)). Each node in the tree is represented by an object, which is required to have a `type` property. The default code generator supports three data types:

#### String

A string of plain text. The `content` property contains the string.

```js
{
  type: 'string',
  content: 'hello world!',
  location: { line: 1, col: 1 }
}
```

#### Tag

An HTML tag. Must have a `name` property with the tag name. Can optionally have an `attributes` property, which is an object with the key being a `string`, and the value being either a `string` or `code` type, or an array of multiple. Can also optionally have a `content` property, which can contain a full AST.

```js
{
  type: 'tag',
  name: 'p',
  attributes: {
    class: [{ type: 'string', content: 'test', line: 1, col: 5 }],
    'data-foo': [{ type: 'string', content: 'bar', line: 1, col: 18 }],
  },
  content: [/* full ast */],
  location: { line: 1, col: 1 }
}
```

#### Code

A piece of code to be evaluated at runtime. Code can access any locals that the user has passed in to the function through the `locals` argument, and any runtime functions through the runtime object, which should be available in any scope that a template function is executed in. The name of the runtime object is configurable and can be accessed via `this.options.runtimeName` within any plugin. The code itself should be in the `content` attribute of the code node.

```js
{
  type: 'code',
  content: 'locals.foo',
  location: { line: 1, col: 1 }
}
```

Sometimes there's a situation where you want code to surround some HTML, in order to control or change its appearance, for example a conditional statement. When this is the case, a special helper can be used within your code so that you can avoid needing to manually run the code generator over the contained nodes. A quick example:

```js
{
  type: 'code',
  content: `if (locals.show) {
    __nodes[0]
  } else {
    __nodes[1]
  }`,
  nodes: [
    { type: 'string', content: 'shown!', location: { line: 1, col: 1 } },
    { type: 'string', content: 'hidden!', location: { line: 2, col: 1 } }
  ]
}
```

In this case, the code generator will parse the nodes in the `nodes` property and inject them at the appropriate locations in your code block. Nodes in the `nodes` property can be full ASTs, and even include more `code` nodes. Note that the `nodes` property is represented inside your code's content as `__nodes` to prevent any potential name conflicts.

Code should be expected to run in any JavaScript environment, from node to the browser, and in any version. As such, care should be taken to make code snippets as simple and widely-compatible as possible.

---

Additionally, all tree nodes should include information about their source, so that errors are clear, and source maps can be accurate. Each tree node must also have two additional properties under the `location` property:

- `line`: the line in the original source
- `col`: the column in the original source

There is a strongly encouraged `filename` option available through the [reshape options](#options). This in combination with the `line` and `col` information can provide accurate debugging. However, if the original source comes from a different file, you can also provide a `filename` property on the tree node so that it is accurate. For example, if using `reshape-include` to include code from a different file, this would be necessary.

#### Example

For the following file:

```html
<div id='main'>
  <p>Hello {{ planet }}</p>
</div>
```

After processing by the `reshape-expressions` plugin, you would get the following tree:

```js
[
  {
    type: 'tag',
    name: 'div',
    attributes: {
      id: [{
        type: 'string',
        content: 'main',
        location: { line: 1, col: 19}
      }]
    },
    content: [
      {
        type: 'tag',
        name: 'p',
        content: [
          {
            type: 'string',
            content: 'Hello ',
            location: { line: 2, col: 6 }
          },
          {
            type: 'code',
            content: 'locals.planet',
            location: { line: 2, col: 13 }
          }
        ],
        location: { line: 2, col: 3 }
      }
    ],
    location: { line: 1, col: 1 }
  }
]
```

> NOTE: Expression parsing and the `code` node type are used entirely by plugins, reshape does not parse any HTML as a `code` node by default.

Which would then be parsed into a function like this by the code generator:

```js
;(function (locals) {
  return "<div id=\"main\">\n  <p>Hello " + locals.planet + "</p>\n</div>"
})
```

And finally, when executed, would turn out as such:

```js
templateFunction({ planet: 'world' })
// <div id="main">
//   <p>Hello world</p>
// </div>
```

> **NOTE**: The code generator produces a function that's a little different than the one above, it was just written this way for clarity. They do the same thing when executed though.

## Writing a Plugin

HTML is a simple language, and because of this, reshape's AST is also quite simple. Plugins are represented by a function, which takes two parameters, the `ast` as described above, and an optional context object, which we will discuss below. All plugins must return an AST. Here's a minimal plugin:

```js
module.exports = function (ast) {
  console.log('hello from the plugin!')
  return ast
}
```

Now let's say we wanted to make a plugin that removes any tag with a `removeme` class. We could do this using a simple [reduce](http://adripofjavascript.com/blog/drips/boiling-down-arrays-with-array-reduce.html) and a bit of [recursion](https://www.codecademy.com/courses/javascript-lesson-205/0/1).

```js
module.exports = function walk (ast) {
  return ast.reduce((m, v, k) => {
    // return without adding to the memo object if we have the 'removeme' class
    if (v.attrs && v.attrs.class[0].content === 'removeme') { return m }
    // if we have contents, recurse
    if (v.type === 'tag' && v.contents) { v.contents = walk(v.contents) }
    // otherwise add the node to the memo and return
    m[k] = v
    return m
  }, {})
}
```

If you are not familiar with the recursion and reduction, we would strongly recommend brushing up before starting your plugin. They are extremely useful concepts across all programming languages, and especially relevant for modifying the reshape AST.

We also have a handy plugin utility that contains some methods that will help with building plugins. [Check it out](https://github.com/reshape/plugin-util) and feel free to use it while building your plugins!

Finally, when you publish a plugin, make sure to use `reshape-plugin` as an npm keyword so that other users can find it, and so it will be added [to our plugin directory](http://plugins.reshape.ml).

### Accessing Options

If you are writing a plugin, it can sometimes be helpful to access reshape's options. For example, if you were writing a plugin that allowed users to `include` a file from a different path, that file would also need to be parsed and transformed into a reshape AST. In this case, you could pull in the parser directly from reshape's options.

For any plugin function, the first parameter passed is the [AST](#reshape-ast), and the second is an `opts` object, which includes the full options used to execute the current compilation. For example:

```js
module.exports = function (ast, opts) {
  console.log(opts)
  return ast
}
```

This plugin would do nothing except for logging out reshape's options. While it is possible to modify the options, it is strongly discouraged, as it may interfere with other plugins and break your build.

### The Runtime

There are two stages in which code runs in a reshape template function. The first stage we call "compile time", and this is when the HTML is parsed, plugins do their things, and then a function is returned to the user. The second we call "runtime", and this is when the user actually executes that function.

```js
// STAGE 1 - COMPILE TIME: parsing html into a template function
reshape([/*...plugins.. */])
  .process(someHtml)
  .then((res) => {
    console.log(res.output) // [Function]
    // STAGE 2 - RUNTIME: user executes the function
    res.output({ foo: 'bar' })
  })
```

In the `opts` object you can find a property called `runtime`, and chances are it's an empty object. The runtime object is a place where functions can be stored that are utilized during runtime.

For example, [reshape-expressions](https://github.com/reshape/expressions) escapes HTML by default inside of its expression delimiters so that if you type in `You can make a tag bold with <strong>`, it actually outputs that text, instead of a literal `<strong>` HTML tag. But since expressions are passed in by the user at runtime, the escaping must happen then. While it would be possible for the plugin to include the code for escaping along with every single `code` node, this would be a huge waste of space – it would be much easier to just have one place that the escape function could be called from at runtime. This is the purpose of the runtime object.

Within a plugin, if you'd like to add a function to the runtime, you can do this directly using `opts.runtime`. Be careful to choose a unique name and not overwrite other plugins' runtime functions. To use a runtime function within your code, you can use the `__runtime` property, which will be transformed by the code generator to the correct name so that it will work in whatever environment it's used in. For example:

```js
module.exports = function (ast, opts) {
  opts.runtime.escapeHtml = (str) => { /* ...implementation... */}
  ast.push({
    type: 'code',
    content: '__runtime.escapeHtml(\'<strong>\')',
    location: { line: 1, col: 1 }
  })
  return ast
}
```

This is pseudo-code and is just for demonstration purposes, but you can see what's happening here. A function is defined on the `opts.runtime` object, and used within the code later with `__runtime`. This way, you can avoid repetition when you need to be executing runtime code from a plugin.

Also please note that if you do add a function to the `runtime` object, that function must be serializable using `func.toString()`. This is the case because in order to use runtime functions client-side, the runtime must be added to the website as plaintext.

### Error Handling

If you need to throw an error from a plugin, reshape provides a convenient error class that you can utilize to provide the user with a consistent error message that makes it clear from where the error came. You can find it on `opts.PluginError` inside any plugin function. A silly example:

```js
module.exports = function (ast, {PluginError}) {
  if (ast[0].attrs && ast[0].attrs.class[0].content === 'doge') {
    throw new PluginError({
      plugin: 'NoDogePlugin'
      message: 'First element has a \'doge\' class!',
      location: ast[0].location
    })
  }
  return ast
}
```

If this error was hit, it would provide a nice clean message to the user, like this:

```
ReshapePluginError: First element has a 'doge' class!
From Plugin: NoDogePlugin
Location: /Users/me/Desktop/test-project/index.html:1:3

1 | <p class='doge'>foo bar</p>
> |   ^

...rest of the error trace...
```

While you can throw any type of error you'd like, we strongly recommend using the error helper for consistent and clear messaging for your users.

By default, the source and filename will be set by the options passed to `reshape({/* config */}).process(html)`. If you need to point the error to a different source/filename, you can do so by passing `src` and `filename` options to the `PluginError` constructor.

## Etc

- Reshape is licensed under [MIT](LICENSE.md)
- See our [contributing guidelines](contributing.md)
- Huge credit to [posthtml](https://github.com/posthtml/posthtml) for providing the inspiration for this project and the foundational ideas upon which this code was built 💖
