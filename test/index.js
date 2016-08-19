const test = require('ava')
const path = require('path')
const fs = require('fs')
const reshape = require('..')
const customElements = require('reshape-custom-elements')
const exp = require('reshape-expressions')
const sugarml = require('sugarml')
const posthtmlRender = require('posthtml-render')
const posthtlParser = require('posthtml-parser')
const errorPlugin = require('./error_plugin')
const fixtures = path.join(__dirname, 'fixtures')
const ReshapeError = reshape.ReshapeError

test('basic', (t) => {
  return process('basic.html', { plugins: customElements() }).then((res) => {
    t.truthy(res.output() === '<div class="custom">hi</div>\n')
    t.truthy(res.plugins)
    t.truthy(res.runtime)
  })
})

test('custom parser', (t) => {
  return process('sugarml.html', { parser: sugarml }).then((res) => {
    t.truthy(res.output().trim() === '<p>hello world!</p>')
  })
})

test('custom generator', (t) => {
  return process('basic.html', {
    parser: posthtlParser,
    generator: posthtmlRender
  }).then((res) => {
    t.truthy(res.output.trim() === '<custom>hi</custom>')
  })
})

test('parser options', (t) => {
  return process('upcase.html', {
    parserOptions: { lowerCaseTags: true }
  }).then((res) => {
    t.truthy(res.output().trim() === '<div>hi</div>')
  })
})

test('generator options', (t) => {
  return process('selfclosing.html', {
    generatorOptions: { selfClosing: 'slash' }
  }).then((res) => {
    t.truthy(res.output().trim() === '<br />')
  })
})

test('options override to process method', (t) => {
  return process('basic.html', { plugins: [customElements()] }, {
    plugins: [(x) => x]
  }).then((res) => {
    t.truthy(res.output().trim() === '<custom>hi</custom>')
  })
})

test('multi plugin', (t) => {
  return process('expression.html', {
    plugins: [customElements(), exp()]
  }).then((res) => {
    t.truthy(res.output({ foo: 'bar' }).trim() === '<div class="custom">bar</div>')
  })
})

test('error', (t) => {
  const err = new ReshapeError({
    src: '<p>{{ foo -}</p>',
    location: { line: 1, col: 11 },
    filename: '/Sites/foo/index.html',
    message: 'invalid close delimiter',
    plugin: 'reshape-expressions'
  }).toString()
  t.is(err, 'ReshapeError: invalid close delimiter\nFrom Plugin: reshape-expressions\nLocation: /Sites/foo/index.html:1:11\n\n   0. |\n > 1. | <p>{{ foo -}</p>\n      |           ^\n   2. |\n')
})

test('plugin error', (t) => {
  const PluginError = ReshapeError.generatePluginError({
    src: 'foo bar',
    filename: '/foo/bar/wow'
  })
  const err = new PluginError({
    location: { line: 1, col: 4 },
    plugin: 'testPlugin',
    message: 'test'
  }).toString()
  t.is(err, 'ReshapePluginError: test\nFrom Plugin: testPlugin\nLocation: /foo/bar/wow:1:4\n\n   0. |\n > 1. | foo bar\n      |    ^\n   2. |\n')
})

test('plugin error, no plugin name, filename, source', (t) => {
  const PluginError = ReshapeError.generatePluginError()
  const err = new PluginError({
    location: { line: 1, col: 4 },
    message: 'test'
  }).toString()
  t.is(err, 'ReshapePluginError: test\nLocation: [no filename]:1:4')
})

test('plugin error within a plugin', (t) => {
  let err = process('basic.html', {
    filename: path.join(fixtures, 'basic.html'),
    plugins: [errorPlugin]
  })
  t.throws(err, /ReshapePluginError:\sGreetings\snot\spermitted\nFrom\sPlugin:\sNoGreetingsPlugin\nLocation:\n.*reshape\/test\/fixtures\/basic\.html:1:9\n\n>\s1\s|\s<custom>hi<\/custom>\n\s{4}|\s{9}\^\n\s\s2 | \n/)
})

test('parser error handled via promise', (t) => {
  let err = process('sugarml_invalid.html', {
    filename: path.join(fixtures, 'sugarml_invalid.html'),
    parser: sugarml
  })
  t.throws(err, /Cannot parse character "<"/)
})

function process (file, config, config2) {
  const html = fs.readFileSync(path.join(fixtures, file), 'utf8')
  return reshape(config).process(html, config2)
}
