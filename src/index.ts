import type { ServerResponse as Response } from 'node:http'

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

function parse(header: string): string[] {
  const list: string[] = []
  let start = 0
  let end = 0

  // gather tokens
  for (let i = 0; i < header.length; i++) {
    switch (header.charCodeAt(i)) {
      case 0x20 /*   */:
        if (start === end) start = end = i + 1
        break
      case 0x2c /* , */:
        list.push(header.slice(start, end))
        start = end = i + 1
        break
      default:
        end = i + 1
        break
    }
  }

  // final token
  list.push(header.slice(start, end))

  return list
}

export function append(header: string, field: string | string[]): string {
  // get fields array
  const fields = Array.isArray(field) ? field : parse(String(field))

  // assert on invalid field names
  if (!fields.every((f) => FIELD_NAME_REGEXP.test(f))) {
    throw new TypeError('field argument contains an invalid header name')
  }

  // existing, unspecified vary
  if (header === '*') return header

  // enumerate current values
  const vals = new Set(parse(header.toLowerCase()))

  // unspecified vary
  if (fields.includes('*') || vals.has('*')) return '*'

  let val = header

  for (const f of fields) {
    const fld = f.toLowerCase()

    // append value (case-preserving)
    if (!vals.has(fld)) {
      vals.add(fld)
      val = val ? `${val}, ${f}` : f
    }
  }

  return val
}

/**
 * Mark that a request is varied on a header field.
 */
export function vary(res: Response, field: string | string[]): void {
  // get existing header
  const current = res.getHeader('Vary') || ''
  const header = Array.isArray(current) ? current.join(', ') : String(current)

  // set new header
  const val = append(header, field)
  if (val) res.setHeader('Vary', val)
}
