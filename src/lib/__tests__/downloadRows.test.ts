import { describe, expect, it } from 'vitest'

import { rowsToCsv } from '../downloadRows'

describe('rowsToCsv', () => {
  it('quotes every cell', () => {
    expect(rowsToCsv([['A', 'B'], ['1', '2']])).toBe('"A","B"\n"1","2"')
  })

  it('escapes embedded quotes while preserving commas and newlines', () => {
    expect(rowsToCsv([['Text'], ['She said "hello, again"\nand left']])).toBe('"Text"\n"She said ""hello, again""\nand left"')
  })
})
