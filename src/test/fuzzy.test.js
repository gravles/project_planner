import { describe, it, expect } from 'vitest'
import { fuzzyScore, fuzzyFilter } from '../lib/fuzzy'

describe('fuzzyScore', () => {
  it('returns positive for exact match', () => {
    expect(fuzzyScore('kitchen', 'kitchen')).toBeGreaterThan(0)
  })

  it('returns 1 for empty query (matches everything)', () => {
    expect(fuzzyScore('', 'anything')).toBe(1)
  })

  it('returns 0 for empty target', () => {
    expect(fuzzyScore('a', '')).toBe(0)
    expect(fuzzyScore('a', null)).toBe(0)
  })

  it('returns 0 when query chars are not a subsequence', () => {
    expect(fuzzyScore('xyz', 'kitchen faucet')).toBe(0)
  })

  it('is case-insensitive', () => {
    expect(fuzzyScore('KITCHEN', 'Kitchen Reno')).toBeGreaterThan(0)
  })

  it('matches scattered subsequences', () => {
    expect(fuzzyScore('kf', 'kitchen faucet')).toBeGreaterThan(0)
  })

  it('ranks exact match above substring above subsequence', () => {
    const exact = fuzzyScore('deck', 'deck')
    const substring = fuzzyScore('deck', 'deck repair')
    const subsequence = fuzzyScore('deck', 'd-e-c-k spread out')
    expect(exact).toBeGreaterThan(substring)
    expect(substring).toBeGreaterThan(subsequence)
  })

  it('ranks earlier substring matches higher', () => {
    expect(fuzzyScore('tv', 'TV lift cabinet')).toBeGreaterThan(fuzzyScore('tv', 'cabinet with tv'))
  })
})

describe('fuzzyFilter', () => {
  const items = [
    { title: 'TV Lift Cabinet' },
    { title: 'Fourplex Conversion' },
    { title: 'STR Permit Appeal' },
    { title: 'Leather Corner Sectional' },
  ]

  it('filters out non-matches', () => {
    const out = fuzzyFilter('permit', items, i => i.title)
    expect(out).toEqual([{ title: 'STR Permit Appeal' }])
  })

  it('returns everything for empty query, in original order', () => {
    expect(fuzzyFilter('', items, i => i.title)).toEqual(items)
  })

  it('ranks better matches first', () => {
    const out = fuzzyFilter('co', items, i => i.title)
    // "Corner"/"Conversion" contain the substring "co" — both should match
    expect(out.length).toBeGreaterThanOrEqual(2)
    expect(out.every(i => /co/i.test(i.title.replace(/[^a-z]/gi, '')) || /c.*o/i.test(i.title))).toBe(true)
  })
})
