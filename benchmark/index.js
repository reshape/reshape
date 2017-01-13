/* global suite, bench, set */

const reshape = require('../')
const fs = require('fs')
const path = require('path')
const fixtures = path.join(__dirname, 'fixtures')

suite('Basic benchmarks', () => {
  const htmlBasic = fs.readFileSync(path.join(fixtures, 'basic.html'))
  set('iterations', 1000)

  bench('bare bones', (next) => {
    reshape()
      .process(htmlBasic)
      .then((result) => { result.output(); next() })
  })

  bench('return string fn', (next) => {
    reshape({ generatorOptions: { returnString: true } })
      .process(htmlBasic)
      .then((result) => { next() })
  })

  bench('scoped locals', (next) => {
    reshape({ generatorOptions: { scopedLocals: true } })
      .process(htmlBasic)
      .then((result) => { result.output(); next() })
  })
})
