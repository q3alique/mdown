import { describe, it, expect } from 'vitest'
import { countWords } from './wordCount'

describe('countWords', () => {
  it('test_005_a: strips frontmatter and inline code', () => {
    const md = `---
title: Test
---

Hello world

\`code\`
`
    expect(countWords(md)).toBe(2)
  })

  it('test_005_b: strips fenced code blocks', () => {
    const md = `Some text

\`\`\`js
const x = 1
const y = 2
const z = 3
// fifty words would go here but we just need to verify
// they are not counted
\`\`\`

More text`
    expect(countWords(md)).toBe(4) // "Some text" + "More text"
  })
})
