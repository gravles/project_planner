import { describe, it, expect } from 'vitest'
import { cn, formatDate, isOverdue, timeAgo, groupBy } from '../lib/utils'

describe('cn', () => {
  it('joins truthy classes', () => {
    expect(cn('a', 'b', 'c')).toBe('a b c')
  })
  it('filters out falsy values', () => {
    expect(cn('a', null, undefined, false, 'b')).toBe('a b')
  })
  it('returns empty string when all values are falsy', () => {
    expect(cn(null, false, undefined)).toBe('')
  })
  it('handles a single class', () => {
    expect(cn('only')).toBe('only')
  })
})

describe('formatDate', () => {
  it('returns null for null input', () => {
    expect(formatDate(null)).toBeNull()
  })
  it('returns null for undefined input', () => {
    expect(formatDate(undefined)).toBeNull()
  })
  it('formats a Date object', () => {
    expect(formatDate(new Date(2024, 0, 15))).toBe('Jan 15, 2024')
  })
  it('formats a date string', () => {
    expect(formatDate(new Date(2024, 5, 1))).toBe('Jun 1, 2024')
  })
})

describe('isOverdue', () => {
  it('returns false for null', () => {
    expect(isOverdue(null)).toBe(false)
  })
  it('returns false for undefined', () => {
    expect(isOverdue(undefined)).toBe(false)
  })
  it('returns true for a past date', () => {
    expect(isOverdue('2020-01-01')).toBe(true)
  })
  it('returns false for a future date', () => {
    const future = new Date()
    future.setFullYear(future.getFullYear() + 1)
    expect(isOverdue(future.toISOString())).toBe(false)
  })
})

describe('timeAgo', () => {
  it('returns empty string for null', () => {
    expect(timeAgo(null)).toBe('')
  })
  it('returns empty string for undefined', () => {
    expect(timeAgo(undefined)).toBe('')
  })
  it('returns a non-empty string for a valid date', () => {
    const result = timeAgo(new Date())
    expect(typeof result).toBe('string')
    expect(result.length).toBeGreaterThan(0)
  })
  it('includes "ago" suffix for past dates', () => {
    expect(timeAgo(new Date('2020-01-01'))).toContain('ago')
  })
})

describe('groupBy', () => {
  it('groups items by a string key', () => {
    const items = [
      { name: 'a', type: 'x' },
      { name: 'b', type: 'y' },
      { name: 'c', type: 'x' },
    ]
    expect(groupBy(items, i => i.type)).toEqual({
      x: [{ name: 'a', type: 'x' }, { name: 'c', type: 'x' }],
      y: [{ name: 'b', type: 'y' }],
    })
  })
  it('returns an empty object for an empty array', () => {
    expect(groupBy([], i => i.key)).toEqual({})
  })
  it('puts all items in the same group when key is constant', () => {
    const items = [{ v: 1 }, { v: 2 }]
    expect(groupBy(items, () => 'all')).toEqual({ all: [{ v: 1 }, { v: 2 }] })
  })
  it('handles a single item', () => {
    const items = [{ id: 1, status: 'Done' }]
    expect(groupBy(items, i => i.status)).toEqual({ Done: [{ id: 1, status: 'Done' }] })
  })
  it('supports a computed key', () => {
    const items = [{ score: 85 }, { score: 45 }, { score: 72 }]
    const result = groupBy(items, i => (i.score >= 60 ? 'pass' : 'fail'))
    expect(result.pass).toHaveLength(2)
    expect(result.fail).toHaveLength(1)
  })
})
