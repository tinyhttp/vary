import * as uvu from 'uvu'
import assert from 'assert'
import { append } from '../src/index'

function describe(
  name: string,
  fn: (suite: uvu.uvu.Test<uvu.Context>) => void
) {
  const suite = uvu.suite(name)
  fn(suite)
  suite.run()
}

describe('field', (it) => {
  it('should accept string', function () {
    assert.doesNotThrow(append.bind(null, '', 'foo'))
  })

  it('should accept string that is Vary header', function () {
    assert.doesNotThrow(append.bind(null, '', 'foo, bar'))
  })

  it('should accept array of string', function () {
    assert.doesNotThrow(append.bind(null, '', ['foo', 'bar']))
  })

  it('should not allow separator ":"', function () {
    assert.throws(
      append.bind(null, '', 'invalid:header'),
      /field.*contains.*invalid/
    )
  })

  it('should not allow separator " "', function () {
    assert.throws(
      () => append('', 'invalid header'),
      /field.*contains.*invalid/
    )
  })

  it('should not allow non-token characters', function () {
    assert.throws(
      append.bind(null, '', 'invalid\nheader'),
      /field.*contains.*invalid/
    )
    assert.throws(
      append.bind(null, '', 'invalid\u0080header'),
      /field.*contains.*invalid/
    )
  })
})

describe('when header empty', function (it) {
  it('should set value', function () {
    assert.strictEqual(append('', 'Origin'), 'Origin')
  })

  it('should set value with array', function () {
    assert.strictEqual(
      append('', ['Origin', 'User-Agent']),
      'Origin, User-Agent'
    )
  })

  it('should preserve case', function () {
    assert.strictEqual(
      append('', ['ORIGIN', 'user-agent', 'AccepT']),
      'ORIGIN, user-agent, AccepT'
    )
  })
})

describe('when header has values', function (it) {
  it('should set value', function () {
    assert.strictEqual(append('Accept', 'Origin'), 'Accept, Origin')
  })

  it('should set value with array', function () {
    assert.strictEqual(
      append('Accept', ['Origin', 'User-Agent']),
      'Accept, Origin, User-Agent'
    )
  })

  it('should not duplicate existing value', function () {
    assert.strictEqual(append('Accept', 'Accept'), 'Accept')
  })

  it('should compare case-insensitive', function () {
    assert.strictEqual(append('Accept', 'accEPT'), 'Accept')
  })

  it('should preserve case', function () {
    assert.strictEqual(append('Accept', 'AccepT'), 'Accept')
  })
})

describe('when *', function (it) {
  it('should set value', function () {
    assert.strictEqual(append('', '*'), '*')
  })

  it('should act as if all values already set', function () {
    assert.strictEqual(append('*', 'Origin'), '*')
  })

  it('should erradicate existing values', function () {
    assert.strictEqual(append('Accept, Accept-Encoding', '*'), '*')
  })

  it('should update bad existing header', function () {
    assert.strictEqual(append('Accept, Accept-Encoding, *', 'Origin'), '*')
  })
})

describe('when field is string', function (it) {
  it('should set value', function () {
    assert.strictEqual(append('', 'Accept'), 'Accept')
  })

  it('should set value when vary header', function () {
    assert.strictEqual(
      append('', 'Accept, Accept-Encoding'),
      'Accept, Accept-Encoding'
    )
  })

  it('should acept LWS', function () {
    assert.strictEqual(
      append('', '  Accept     ,     Origin    '),
      'Accept, Origin'
    )
  })

  it('should handle contained *', function () {
    assert.strictEqual(append('', 'Accept,*'), '*')
  })
})

describe('when field is array', function (it) {
  it('should set value', function () {
    assert.strictEqual(
      append('', ['Accept', 'Accept-Language']),
      'Accept, Accept-Language'
    )
  })

  it('should ignore double-entries', function () {
    assert.strictEqual(append('', ['Accept', 'Accept']), 'Accept')
  })

  it('should be case-insensitive', function () {
    assert.strictEqual(append('', ['Accept', 'ACCEPT']), 'Accept')
  })

  it('should handle contained *', function () {
    assert.strictEqual(append('', ['Origin', 'User-Agent', '*', 'Accept']), '*')
  })

  it('should handle existing values', function () {
    assert.strictEqual(
      append('Accept, Accept-Encoding', ['origin', 'accept', 'accept-charset']),
      'Accept, Accept-Encoding, origin, accept-charset'
    )
  })
})
