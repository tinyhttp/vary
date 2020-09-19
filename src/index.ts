import { ServerResponse as Response } from 'http'

/**
 * RegExp to match field-name in RFC 7230 sec 3.2
 *
 * field-name    = token
 * token         = 1*tchar
 * tchar         = "!" / "#" / "$" / "%" / "&" / "'" / "*"
 *               / "+" / "-" / "." / "^" / "_" / "`" / "|" / "~"
 *               / DIGIT / ALPHA
 *               ; any VCHAR, except delimiters
 */

const FIELD_NAME_REGEXP = /^[!#$%&'*+\-.^_`|~0-9A-Za-z]+$/

function parse(header: string) {
  let end = 0
  let list = []
  let start = 0

  // gather tokens
  for (var i = 0, len = header.length; i < len; i++) {
    switch (header.charCodeAt(i)) {
      case 0x20 /*   */:
        if (start === end) {
          start = end = i + 1
        }
        break
      case 0x2c /* , */:
        list.push(header.substring(start, end))
        start = end = i + 1
        break
      default:
        end = i + 1
        break
    }
  }

  // final token
  list.push(header.substring(start, end))

  return list
}

export function append(header: string, field: string) {
  // get fields array
  const fields = !Array.isArray(field) ? parse(String(field)) : field

  // assert on invalid field names
  for (const field of fields) {
    if (!FIELD_NAME_REGEXP.test(field)) {
      throw new TypeError('field argument contains an invalid header name')
    }
  }

  // existing, unspecified vary
  if (header === '*') {
    return header
  }

  // enumerate current values
  let val = header
  const vals = parse(header.toLowerCase())

  // unspecified vary
  if (fields.indexOf('*') !== -1 || vals.indexOf('*') !== -1) {
    return '*'
  }

  for (const field of fields) {
    const fld = field.toLowerCase()

    // append value (case-preserving)
    if (vals.indexOf(fld) === -1) {
      vals.push(fld)
      val = val ? val + ', ' + field : field
    }
  }

  return val
}
/**
 * Mark that a request is varied on a header field.
 */
export function vary(res: Response, field: string) {
  if (!res || !res.getHeader || !res.setHeader) {
    // quack quack
    throw new TypeError('res argument is required')
  }

  // get existing header
  let val = res.getHeader('Vary') || ''
  const header = Array.isArray(val) ? val.join(', ') : String(val)

  // set new header
  if ((val = append(header, field))) {
    res.setHeader('Vary', val)
  }
}
