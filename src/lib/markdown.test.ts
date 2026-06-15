import { describe, it, expect } from 'vitest'
import { renderMarkdown, getFrontmatter } from './markdown'

describe('renderMarkdown', () => {
  it('renders headings with correct structure', () => {
    const result = renderMarkdown('# Hello\n\n## World\n\nParagraph')
    expect(result.html).toContain('<h1')
    expect(result.html).toContain('Hello')
    expect(result.html).toContain('<h2')
    expect(result.html).toContain('World')
    expect(result.html).toContain('<p')
    expect(result.html).toContain('Paragraph')
  })

  it('strips frontmatter and parses it correctly', () => {
    const md = `---
title: Test Document
author: Jane
date: 2026-01-15
---

# Body`
    const result = renderMarkdown(md)
    // Frontmatter should NOT appear in HTML
    expect(result.html).not.toContain('Test Document')
    expect(result.html).not.toContain('Jane')
    // Body should be rendered
    expect(result.html).toContain('<h1')
    expect(result.html).toContain('Body')
    // Frontmatter should be parsed
    const fm = getFrontmatter()
    expect(fm.parsed?.title).toBe('Test Document')
    expect(fm.parsed?.author).toBe('Jane')
    // Date from YAML is parsed as Date object, converted to ISO string
    expect(fm.parsed?.date).toBe('2026-01-15T00:00:00.000Z')
  })

  it('extracts headings with id, text, and level', () => {
    const md = `# Title\n\n## Section 1\n\n### Subsection\n\n## Section 2`
    const result = renderMarkdown(md)
    expect(result.headings.length).toBe(4)
    expect(result.headings[0].level).toBe(1)
    expect(result.headings[0].text).toBe('Title')
    expect(result.headings[1].level).toBe(2)
    expect(result.headings[1].text).toBe('Section 1')
    expect(result.headings[2].level).toBe(3)
    expect(result.headings[2].text).toBe('Subsection')
    expect(result.headings[3].level).toBe(2)
    expect(result.headings[3].text).toBe('Section 2')
  })

  it('escapes raw HTML (html:false mode)', () => {
    const md = '<script>alert("xss")</script>'
    const result = renderMarkdown(md)
    expect(result.html).not.toContain('<script')
    expect(result.html).toContain('&lt;script')
  })

  it('highlights code blocks with language', () => {
    const md = '```js\nconst x = 1\n```'
    const result = renderMarkdown(md)
    expect(result.html).toContain('hljs')
    expect(result.html).toContain('<code>')
  })
})
