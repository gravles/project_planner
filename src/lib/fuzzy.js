// Small fuzzy matcher for the command palette. No dependency needed at this scale.

// Returns a score > 0 if `query` matches `target`, else 0. Higher = better.
// Exact substring matches beat subsequence matches; earlier and word-start
// matches beat scattered ones.
export function fuzzyScore(query, target) {
  if (!query) return 1
  if (!target) return 0
  const q = query.toLowerCase()
  const t = target.toLowerCase()

  const idx = t.indexOf(q)
  if (idx !== -1) {
    let score = 100 - Math.min(idx, 50)
    if (t.length === q.length) score += 50 // exact match
    if (idx === 0 || t[idx - 1] === ' ') score += 10 // word boundary
    return score
  }

  // Subsequence match: every query char must appear in order
  let qi = 0
  let score = 0
  let prevMatch = -2
  for (let ti = 0; ti < t.length && qi < q.length; ti++) {
    if (t[ti] === q[qi]) {
      score += 1
      if (ti === prevMatch + 1) score += 2 // consecutive run
      if (ti === 0 || t[ti - 1] === ' ' || t[ti - 1] === '-' || t[ti - 1] === '_') score += 3 // word start
      prevMatch = ti
      qi++
    }
  }
  return qi === q.length ? score : 0
}

// Filters + ranks `items` by fuzzy match on getText(item). Stable for ties.
export function fuzzyFilter(query, items, getText) {
  return items
    .map((item, i) => ({ item, i, score: fuzzyScore(query, getText(item)) }))
    .filter(r => r.score > 0)
    .sort((a, b) => b.score - a.score || a.i - b.i)
    .map(r => r.item)
}
