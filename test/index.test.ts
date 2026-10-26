import assert from 'node:assert'
import { IncomingMessage, ServerResponse } from 'node:http'
import * as uvu from 'uvu'
import { append, vary } from '../src/index.ts'

function describe(
  name: string,
  fn: (suite: uvu.uvu.Test<uvu.Context>) => void
) {
  const suite = uvu.suite(name)
  fn(suite)
  suite.run()
}

describe('field', (it) => {
  it('should accept string', () => {
    assert.doesNotThrow(append.bind(null, '', 'foo'))
  })

  it('should accept string that is Vary header', () => {
    assert.doesNotThrow(append.bind(null, '', 'foo, bar'))
  })

  it('should accept array of string', () => {
    assert.doesNotThrow(append.bind(null, '', ['foo', 'bar']))
  })

  it('should not allow separator ":"', () => {
    assert.throws(
      append.bind(null, '', 'invalid:header'),
      /field.*contains.*invalid/
    )
  })

  it('should not allow separator " "', () => {
    assert.throws(
      () => append('', 'invalid header'),
      /field.*contains.*invalid/
    )
  })

  it('should not allow non-token characters', () => {
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

describe('when header empty', (it) => {
  it('should set value', () => {
    assert.strictEqual(append('', 'Origin'), 'Origin')
  })

  it('should set value with array', () => {
    assert.strictEqual(
      append('', ['Origin', 'User-Agent']),
      'Origin, User-Agent'
    )
  })

  it('should preserve case', () => {
    assert.strictEqual(
      append('', ['ORIGIN', 'user-agent', 'AccepT']),
      'ORIGIN, user-agent, AccepT'
    )
  })
})

describe('when header has values', (it) => {
  it('should set value', () => {
    assert.strictEqual(append('Accept', 'Origin'), 'Accept, Origin')
  })

  it('should set value with array', () => {
    assert.strictEqual(
      append('Accept', ['Origin', 'User-Agent']),
      'Accept, Origin, User-Agent'
    )
  })

  it('should not duplicate existing value', () => {
    assert.strictEqual(append('Accept', 'Accept'), 'Accept')
  })

  it('should compare case-insensitive', () => {
    assert.strictEqual(append('Accept', 'accEPT'), 'Accept')
  })

  it('should preserve case', () => {
    assert.strictEqual(append('Accept', 'AccepT'), 'Accept')
  })
})

describe('when *', (it) => {
  it('should set value', () => {
    assert.strictEqual(append('', '*'), '*')
  })

  it('should act as if all values already set', () => {
    assert.strictEqual(append('*', 'Origin'), '*')
  })

  it('should erradicate existing values', () => {
    assert.strictEqual(append('Accept, Accept-Encoding', '*'), '*')
  })

  it('should update bad existing header', () => {
    assert.strictEqual(append('Accept, Accept-Encoding, *', 'Origin'), '*')
  })
})

describe('when field is string', (it) => {
  it('should set value', () => {
    assert.strictEqual(append('', 'Accept'), 'Accept')
  })

  it('should set value when vary header', () => {
    assert.strictEqual(
      append('', 'Accept, Accept-Encoding'),
      'Accept, Accept-Encoding'
    )
  })

  it('should acept LWS', () => {
    assert.strictEqual(
      append('', '  Accept     ,     Origin    '),
      'Accept, Origin'
    )
  })

  it('should handle contained *', () => {
    assert.strictEqual(append('', 'Accept,*'), '*')
  })
})

describe('when field is array', (it) => {
  it('should set value', () => {
    assert.strictEqual(
      append('', ['Accept', 'Accept-Language']),
      'Accept, Accept-Language'
    )
  })

  it('should ignore double-entries', () => {
    assert.strictEqual(append('', ['Accept', 'Accept']), 'Accept')
  })

  it('should be case-insensitive', () => {
    assert.strictEqual(append('', ['Accept', 'ACCEPT']), 'Accept')
  })

  it('should handle contained *', () => {
    assert.strictEqual(append('', ['Origin', 'User-Agent', '*', 'Accept']), '*')
  })

  it('should handle existing values', () => {
    assert.strictEqual(
      append('Accept, Accept-Encoding', ['origin', 'accept', 'accept-charset']),
      'Accept, Accept-Encoding, origin, accept-charset'
    )
  })
})

describe('vary(res, field)', (it) => {
  const createRes = () => new ServerResponse(new IncomingMessage(null as never))

  it('should set Vary header', () => {
    const res = createRes()
    vary(res, 'Origin')
    assert.strictEqual(res.getHeader('Vary'), 'Origin')
  })

  it('should append to existing Vary header', () => {
    const res = createRes()
    res.setHeader('Vary', 'Accept')
    vary(res, ['Origin', 'accept'])
    assert.strictEqual(res.getHeader('Vary'), 'Accept, Origin')
  })

  it('should join array Vary header', () => {
    const res = createRes()
    res.setHeader('Vary', ['Accept', 'User-Agent'])
    vary(res, 'Origin')
    assert.strictEqual(res.getHeader('Vary'), 'Accept, User-Agent, Origin')
  })

  it('should not set header when result is empty', () => {
    const res = createRes()
    vary(res, [])
    assert.strictEqual(res.hasHeader('Vary'), false)
  })
})
