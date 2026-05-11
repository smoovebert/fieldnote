import { describe, expect, it } from 'vitest'

import { parseCsv } from '../csv'

describe('parseCsv', () => {
  it('parses simple rows', () => {
    expect(parseCsv('Case,Role\nMaria,Student')).toEqual([
      ['Case', 'Role'],
      ['Maria', 'Student'],
    ])
  })

  it('keeps commas, quotes, and newlines inside quoted cells', () => {
    expect(parseCsv('Name,Note\n"Maria, S.","said ""hello""\nthen left"')).toEqual([
      ['Name', 'Note'],
      ['Maria, S.', 'said "hello"\nthen left'],
    ])
  })

  it('drops rows that are entirely blank', () => {
    expect(parseCsv('A,B\n,\n1,2\n   ,   ')).toEqual([
      ['A', 'B'],
      ['1', '2'],
    ])
  })
})
